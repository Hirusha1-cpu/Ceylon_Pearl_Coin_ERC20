// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CeylonPearl} from "../src/CeylonPearl.sol";
import {CeylonPearlVesting} from "../src/CeylonPearlVesting.sol";
import {CeylonPearlStaking} from "../src/CeylonPearlStaking.sol";

/**
 * @notice Deploys Vesting + Staking and wires up roles against an already
 *         deployed CeylonPearl token.
 *
 * Set TOKEN_ADDRESS env var to the address printed by DeployToken.s.sol first.
 *
 * Run:
 *   TOKEN_ADDRESS=0x... forge script script/DeployVestingAndStaking.s.sol:DeployVestingAndStaking \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployVestingAndStaking is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPk);
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");

        CeylonPearl token = CeylonPearl(tokenAddress);

        vm.startBroadcast(deployerPk);

        CeylonPearlVesting vesting = new CeylonPearlVesting(tokenAddress, admin);
        CeylonPearlStaking staking = new CeylonPearlStaking(tokenAddress, tokenAddress, admin);

        // Grant staking contract permission to mint reward tokens directly,
        // OR (safer) pre-fund it instead of granting MINTER_ROLE.
        // Here we choose pre-funding via transfer for auditability:
        token.transfer(address(staking), 50_000 ether); // reward pool seed

        vm.stopBroadcast();

        console.log("Vesting deployed at:", address(vesting));
        console.log("Staking deployed at:", address(staking));
    }
}
