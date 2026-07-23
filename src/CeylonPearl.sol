// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CeylonPearl
 * @notice Core ERC20 token for the Ceylon Pearl ecosystem.
 * @dev Combines:
 *      - ERC20Permit (EIP-2612): gasless approvals via off-chain signature
 *      - AccessControl: role-based minting instead of single-owner minting
 *      - Capped supply: enforced manually in _update (no separate ERC20Capped needed)
 *      - Pausable: emergency stop for transfers
 *
 * Roles:
 *  - DEFAULT_ADMIN_ROLE  -> should be transferred to a Timelock contract in production
 *  - MINTER_ROLE         -> granted to Vesting contract / controlled minter
 *  - PAUSER_ROLE         -> granted to admin/multisig for emergency stop
 */
contract CeylonPearl is ERC20, ERC20Permit, ERC20Pausable, AccessControl {
    // ---------------------------------------------------------------------
    // Roles
    // ---------------------------------------------------------------------
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------
    uint256 public immutable cap;

    // ---------------------------------------------------------------------
    // Errors (custom errors = cheaper gas than require strings)
    // ---------------------------------------------------------------------
    error CeylonPearl__CapExceeded(uint256 requested, uint256 cap);
    error CeylonPearl__ZeroAddress();

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    /**
     * @param initialSupply   amount minted to `admin` at deployment (18 decimals)
     * @param cap_            maximum total supply that can ever exist
     * @param admin           receives DEFAULT_ADMIN_ROLE + initial supply
     */
    constructor(
        uint256 initialSupply,
        uint256 cap_,
        address admin
    ) ERC20("Ceylon Pearl", "CPRL") ERC20Permit("Ceylon Pearl") {
        if (admin == address(0)) revert CeylonPearl__ZeroAddress();
        if (initialSupply > cap_) revert CeylonPearl__CapExceeded(initialSupply, cap_);

        cap = cap_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        if (initialSupply > 0) {
            _mint(admin, initialSupply);
        }
    }

    // ---------------------------------------------------------------------
    // Minting (role-gated, cap-enforced)
    // ---------------------------------------------------------------------
    /**
     * @notice Mint new tokens. Only callable by MINTER_ROLE (e.g. Vesting contract).
     * @dev Cap check happens here explicitly so the error is descriptive.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (totalSupply() + amount > cap) {
            revert CeylonPearl__CapExceeded(totalSupply() + amount, cap);
        }
        _mint(to, amount);
    }

    // ---------------------------------------------------------------------
    // Pause controls
    // ---------------------------------------------------------------------
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Required overrides (Solidity multiple-inheritance resolution)
    // ---------------------------------------------------------------------
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
