// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CeylonPearl} from "../../src/CeylonPearl.sol";

contract CeylonPearlTest is Test {
    CeylonPearl token;

    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 constant CAP            = 10_000_000 ether;

    function setUp() public {
        vm.prank(admin);
        token = new CeylonPearl(INITIAL_SUPPLY, CAP, admin);
    }

    // ---------------------------------------------------------------
    // Deployment
    // ---------------------------------------------------------------
    function test_InitialSupplyMintedToAdmin() public view {
        assertEq(token.balanceOf(admin), INITIAL_SUPPLY);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
    }

    function test_AdminHasRoles() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(token.hasRole(token.MINTER_ROLE(), admin));
        assertTrue(token.hasRole(token.PAUSER_ROLE(), admin));
    }

    // ---------------------------------------------------------------
    // Minting
    // ---------------------------------------------------------------
    function test_MinterCanMintWithinCap() public {
        vm.prank(admin);
        token.mint(alice, 1000 ether);
        assertEq(token.balanceOf(alice), 1000 ether);
    }

    function test_RevertWhen_MintExceedsCap() public {
        uint256 tooMuch = CAP - INITIAL_SUPPLY + 1;
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                CeylonPearl.CeylonPearl__CapExceeded.selector,
                INITIAL_SUPPLY + tooMuch,
                CAP
            )
        );
        token.mint(alice, tooMuch);
    }

    function test_RevertWhen_NonMinterMints() public {
        vm.prank(alice);
        vm.expectRevert(); // AccessControl unauthorized error
        token.mint(alice, 1 ether);
    }

    // ---------------------------------------------------------------
    // Pausing
    // ---------------------------------------------------------------
    function test_RevertWhen_TransferWhilePaused() public {
        vm.prank(admin);
        token.mint(alice, 100 ether);

        vm.prank(admin);
        token.pause();

        vm.prank(alice);
        vm.expectRevert();
        token.transfer(bob, 10 ether);
    }

    function test_TransferWorksAfterUnpause() public {
        vm.startPrank(admin);
        token.mint(alice, 100 ether);
        token.pause();
        token.unpause();
        vm.stopPrank();

        vm.prank(alice);
        token.transfer(bob, 10 ether);
        assertEq(token.balanceOf(bob), 10 ether);
    }

    // ---------------------------------------------------------------
    // Permit (EIP-2612) — gasless approval
    // ---------------------------------------------------------------
    function test_Permit_SetsAllowanceViaSignature() public {
        uint256 ownerPk = 0xA11CE;
        address owner = vm.addr(ownerPk);

        vm.prank(admin);
        token.mint(owner, 100 ether);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 PERMIT_TYPEHASH = keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );
        bytes32 structHash = keccak256(abi.encode(
            PERMIT_TYPEHASH, owner, bob, 50 ether, token.nonces(owner), deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);

        token.permit(owner, bob, 50 ether, deadline, v, r, s);
        assertEq(token.allowance(owner, bob), 50 ether);
    }
}
