// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CeylonPearl} from "../../src/CeylonPearl.sol";
import {TokenHandler} from "./handlers/TokenHandler.sol";

/**
 * @title CeylonPearlInvariant
 * @notice Properties that must hold true after ANY sequence of valid calls.
 *
 * How it works:
 *  - targetContract(address(handler)) tells Foundry: "only call functions on
 *    the handler, not directly on the token" — this keeps calls bounded/valid.
 *  - Foundry then calls handler functions thousands of times with random
 *    args/order, and after each run checks every invariant_* function.
 */
contract CeylonPearlInvariantTest is Test {
    CeylonPearl token;
    TokenHandler handler;

    address admin = makeAddr("admin");
    uint256 constant CAP = 10_000_000 ether;

    function setUp() public {
        vm.prank(admin);
        token = new CeylonPearl(0, CAP, admin);

        handler = new TokenHandler(token, admin);

        // grant handler-controlled admin the minter role stays with admin;
        // handler itself calls token.mint() via vm.prank(admin) internally.
        targetContract(address(handler));
    }

    /// @notice Total supply can never exceed the immutable cap.
    function invariant_TotalSupplyNeverExceedsCap() public view {
        assertLe(token.totalSupply(), CAP);
    }

    /// @notice Sum of all actor balances must equal totalSupply (no tokens lost/created).
    function invariant_SumOfBalancesEqualsTotalSupply() public view {
        address[] memory actors = handler.actorsList();
        uint256 sum;
        for (uint256 i = 0; i < actors.length; i++) {
            sum += token.balanceOf(actors[i]);
        }
        // admin may also hold a balance if it ever receives a transfer in this setup
        sum += token.balanceOf(admin);
        assertEq(sum, token.totalSupply());
    }

    /// @notice totalMinted tracked by handler should never exceed cap.
    function invariant_HandlerMintTrackingNeverExceedsCap() public view {
        assertLe(handler.totalMinted(), CAP);
    }
}
