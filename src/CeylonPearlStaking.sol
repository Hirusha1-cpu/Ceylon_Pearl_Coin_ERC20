// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CeylonPearlStaking
 * @notice Stake CPRL, earn CPRL rewards. Uses the standard "reward-per-token"
 *         checkpoint pattern (same design used by Synthetix/most farm contracts).
 *
 * Why this pattern: instead of looping over all stakers to distribute rewards
 * (which would be O(n) and gas-unbounded), we track a global accumulator
 * (rewardPerTokenStored) and each user's "paid" checkpoint. Reward owed to a
 * user = balance * (currentRewardPerToken - userRewardPerTokenPaid).
 */
contract CeylonPearlStaking is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant REWARD_MANAGER_ROLE = keccak256("REWARD_MANAGER_ROLE");

    IERC20 public immutable stakingToken; // CPRL
    IERC20 public immutable rewardToken;  // CPRL (same token, or separate reward token)

    uint256 public rewardRate;            // reward tokens distributed per second
    uint256 public rewardPerTokenStored;  // accumulator, scaled by 1e18
    uint256 public lastUpdateTime;
    uint256 public periodFinish;          // timestamp when current reward period ends

    uint256 public totalStaked;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards; // accrued, unclaimed

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(uint256 reward, uint256 duration);

    error Staking__ZeroAmount();
    error Staking__InsufficientBalance();
    error Staking__ZeroAddress();

    constructor(address stakingToken_, address rewardToken_, address admin) {
        if (stakingToken_ == address(0) || rewardToken_ == address(0) || admin == address(0)) {
            revert Staking__ZeroAddress();
        }
        stakingToken = IERC20(stakingToken_);
        rewardToken = IERC20(rewardToken_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REWARD_MANAGER_ROLE, admin);
    }

    // ---------------------------------------------------------------------
    // Modifier: updates global + user reward checkpoints BEFORE any action.
    // This is the core of the checkpoint pattern - always run this first.
    // ---------------------------------------------------------------------
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // ---------------------------------------------------------------------
    // User actions
    // ---------------------------------------------------------------------
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        if (amount == 0) revert Staking__ZeroAmount();

        // --- Effects ---
        totalStaked += amount;
        balanceOf[msg.sender] += amount;

        // --- Interaction ---
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        if (amount == 0) revert Staking__ZeroAmount();
        if (balanceOf[msg.sender] < amount) revert Staking__InsufficientBalance();

        // --- Effects ---
        totalStaked -= amount;
        balanceOf[msg.sender] -= amount;

        // --- Interaction ---
        stakingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function claimReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            // --- Effects ---
            rewards[msg.sender] = 0;
            // --- Interaction ---
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external {
        withdraw(balanceOf[msg.sender]);
        claimReward();
    }

    // ---------------------------------------------------------------------
    // Admin: fund a new reward period
    // ---------------------------------------------------------------------
    function notifyRewardAmount(uint256 reward, uint256 duration)
        external
        onlyRole(REWARD_MANAGER_ROLE)
        updateReward(address(0))
    {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / duration;
        }

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + duration;

        emit RewardAdded(reward, duration);
    }

    // ---------------------------------------------------------------------
    // Views (reward math)
    // ---------------------------------------------------------------------
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        uint256 elapsed = lastTimeRewardApplicable() - lastUpdateTime;
        return rewardPerTokenStored + (elapsed * rewardRate * 1e18) / totalStaked;
    }

    function earned(address account) public view returns (uint256) {
        return (balanceOf[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18
            + rewards[account];
    }
}
