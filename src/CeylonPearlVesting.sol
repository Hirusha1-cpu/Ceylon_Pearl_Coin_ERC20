// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CeylonPearlVesting
 * @notice Linear vesting with a cliff, for team/investor token allocations.
 * @dev Flow:
 *      1. Admin calls createVestingSchedule(beneficiary, amount, cliffDuration, vestingDuration)
 *      2. Contract must already hold enough CPRL tokens (transferred in beforehand)
 *      3. Beneficiary calls release() any time after cliff to claim vested amount
 *
 * CEI pattern: all state (released amounts) is updated BEFORE external transfer calls.
 */
contract CeylonPearlVesting is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");

    IERC20 public immutable token;

    struct VestingSchedule {
        uint256 totalAmount;     // total tokens allocated
        uint256 released;        // amount already released
        uint64  start;           // vesting start timestamp
        uint64  cliffDuration;   // seconds before any tokens vest
        uint64  vestingDuration; // total seconds until fully vested
        bool    revocable;
        bool    revoked;
    }

    // one schedule per beneficiary (extend to array if multiple schedules/person needed)
    mapping(address => VestingSchedule) public schedules;

    event VestingScheduleCreated(address indexed beneficiary, uint256 amount, uint64 cliff, uint64 duration);
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary, uint256 unvestedReturned);

    error Vesting__ScheduleExists();
    error Vesting__NoSchedule();
    error Vesting__NothingToRelease();
    error Vesting__NotRevocable();
    error Vesting__AlreadyRevoked();
    error Vesting__ZeroAddress();
    error Vesting__ZeroAmount();

    constructor(address tokenAddress, address admin) {
        if (tokenAddress == address(0) || admin == address(0)) revert Vesting__ZeroAddress();
        token = IERC20(tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VESTING_ADMIN_ROLE, admin);
    }

    /**
     * @notice Create a new vesting schedule. Contract must already hold `amount` tokens.
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint64 cliffDuration,
        uint64 vestingDuration,
        bool revocable
    ) external onlyRole(VESTING_ADMIN_ROLE) {
        if (beneficiary == address(0)) revert Vesting__ZeroAddress();
        if (amount == 0) revert Vesting__ZeroAmount();
        if (schedules[beneficiary].totalAmount != 0) revert Vesting__ScheduleExists();

        schedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            released: 0,
            start: uint64(block.timestamp),
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            revocable: revocable,
            revoked: false
        });

        emit VestingScheduleCreated(beneficiary, amount, cliffDuration, vestingDuration);
    }

    /**
     * @notice Beneficiary claims currently-releasable tokens.
     */
    function release() external {
        VestingSchedule storage schedule = schedules[msg.sender];
        if (schedule.totalAmount == 0) revert Vesting__NoSchedule();

        uint256 releasable = _releasableAmount(schedule);
        if (releasable == 0) revert Vesting__NothingToRelease();

        // --- Effects before Interaction (CEI) ---
        schedule.released += releasable;

        // --- Interaction ---
        token.safeTransfer(msg.sender, releasable);

        emit TokensReleased(msg.sender, releasable);
    }

    /**
     * @notice Admin can revoke a revocable schedule; unvested tokens return to admin.
     */
    function revoke(address beneficiary) external onlyRole(VESTING_ADMIN_ROLE) {
        VestingSchedule storage schedule = schedules[beneficiary];
        if (schedule.totalAmount == 0) revert Vesting__NoSchedule();
        if (!schedule.revocable) revert Vesting__NotRevocable();
        if (schedule.revoked) revert Vesting__AlreadyRevoked();

        uint256 vested = _vestedAmount(schedule);
        uint256 unreleased = vested - schedule.released;
        uint256 unvested = schedule.totalAmount - vested;

        // --- Effects ---
        schedule.revoked = true;
        schedule.totalAmount = vested; // freeze allocation at currently-vested amount
        schedule.released = vested;

        // --- Interactions ---
        if (unreleased > 0) {
            token.safeTransfer(beneficiary, unreleased);
        }
        if (unvested > 0) {
            token.safeTransfer(msg.sender, unvested);
        }

        emit VestingRevoked(beneficiary, unvested);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------
    function releasableAmount(address beneficiary) external view returns (uint256) {
        return _releasableAmount(schedules[beneficiary]);
    }

    function vestedAmount(address beneficiary) external view returns (uint256) {
        return _vestedAmount(schedules[beneficiary]);
    }

    // ---------------------------------------------------------------------
    // Internal math
    // ---------------------------------------------------------------------
    function _releasableAmount(VestingSchedule storage schedule) internal view returns (uint256) {
        return _vestedAmount(schedule) - schedule.released;
    }

    function _vestedAmount(VestingSchedule storage schedule) internal view returns (uint256) {
        if (block.timestamp < schedule.start + schedule.cliffDuration) {
            return 0;
        }
        if (block.timestamp >= schedule.start + schedule.vestingDuration || schedule.revoked) {
            return schedule.totalAmount;
        }
        uint256 elapsed = block.timestamp - schedule.start;
        return (schedule.totalAmount * elapsed) / schedule.vestingDuration;
    }
}
