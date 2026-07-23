// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CeylonPearl} from "../../../src/CeylonPearl.sol";

/**
 * @title TokenHandler
 * @notice Defines the "valid" set of randomized actions the invariant fuzzer
 *         is allowed to call. Foundry calls these functions in random order,
 *         random amounts, thousands of times, then checks invariants still hold.
 *
 * Without a handler, Foundry would call totally unbounded/nonsensical inputs
 * directly on the contract. The handler bounds inputs to realistic ranges
 * and tracks a "ghost" list of actors so we get meaningful call sequences.
 */
contract TokenHandler is Test {
    CeylonPearl public token;
    address public admin;

    address[] public actors;
    uint256 public totalMinted;

    constructor(CeylonPearl token_, address admin_) {
        token = token_;
        admin = admin_;

        for (uint256 i = 0; i < 5; i++) {
            actors.push(address(uint160(uint256(keccak256(abi.encode("actor", i))))));
        }
    }

    function mint(uint256 actorSeed, uint256 amount) external {
        address to = _actor(actorSeed);
        amount = bound(amount, 0, token.cap() - token.totalSupply());
        if (amount == 0) return;

        vm.prank(admin);
        token.mint(to, amount);
        totalMinted += amount;
    }

    function transfer(uint256 fromSeed, uint256 toSeed, uint256 amount) external {
        address from = _actor(fromSeed);
        address to = _actor(toSeed);
        uint256 bal = token.balanceOf(from);
        if (bal == 0) return;
        amount = bound(amount, 0, bal);

        vm.prank(from);
        token.transfer(to, amount);
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function actorsList() external view returns (address[] memory) {
        return actors;
    }
}
