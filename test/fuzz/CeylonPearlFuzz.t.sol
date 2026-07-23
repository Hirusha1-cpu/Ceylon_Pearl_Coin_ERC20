// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CeylonPearl} from "../../src/CeylonPearl.sol";
import {CeylonPearlStaking} from "../../src/CeylonPearlStaking.sol";

contract CeylonPearlFuzzTest is Test {
    CeylonPearl token;
    CeylonPearlStaking staking;

    address admin = makeAddr("admin");
    uint256 constant CAP = 10_000_000 ether;

    function setUp() public {
        vm.startPrank(admin);
        token = new CeylonPearl(0, CAP, admin);
        staking = new CeylonPearlStaking(address(token), address(token), admin);
        token.grantRole(token.MINTER_ROLE(), address(staking));
        vm.stopPrank();
    }

    /// @notice Minting should NEVER push totalSupply above cap, for any amount.
    function testFuzz_MintNeverExceedsCap(uint256 amount) public {
        amount = bound(amount, 0, type(uint256).max);

        vm.prank(admin);
        if (amount > CAP) {
            vm.expectRevert();
            token.mint(address(0xBEEF), amount);
        } else {
            token.mint(address(0xBEEF), amount);
            assertLe(token.totalSupply(), CAP);
        }
    }

    /// @notice Transfer amount should always move exactly `amount` between accounts.
    function testFuzz_TransferPreservesTotalSupply(uint256 mintAmount, uint256 transferAmount) public {
        mintAmount = bound(mintAmount, 1, CAP);
        transferAmount = bound(transferAmount, 0, mintAmount);

        address alice = makeAddr("alice");
        address bob = makeAddr("bob");

        vm.prank(admin);
        token.mint(alice, mintAmount);

        uint256 supplyBefore = token.totalSupply();

        vm.prank(alice);
        token.transfer(bob, transferAmount);

        assertEq(token.totalSupply(), supplyBefore); // transfers never change supply
        assertEq(token.balanceOf(bob), transferAmount);
        assertEq(token.balanceOf(alice), mintAmount - transferAmount);
    }

    /// @notice Stake then withdraw same amount should return user to original balance.
    function testFuzz_StakeAndFullWithdraw(uint256 amount, uint256 timeJump) public {
        amount = bound(amount, 1, CAP);
        timeJump = bound(timeJump, 0, 365 days);

        address alice = makeAddr("alice");
        vm.prank(admin);
        token.mint(alice, amount);

        vm.startPrank(alice);
        token.approve(address(staking), amount);
        staking.stake(amount);
        vm.stopPrank();

        skip(timeJump);

        vm.prank(alice);
        staking.withdraw(amount);

        assertEq(staking.balanceOf(alice), 0);
        assertGe(token.balanceOf(alice), amount); // principal returned, rewards may add more
    }
}
