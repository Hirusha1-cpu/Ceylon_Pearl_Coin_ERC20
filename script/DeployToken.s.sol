// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CeylonPearl} from "../src/CeylonPearl.sol";

/**
 * @notice Deploys CeylonPearl token.
 *
 * Run:
 *   forge script script/DeployToken.s.sol:DeployToken \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployToken is Script {
    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 constant CAP            = 10_000_000 ether;

    function run() external returns (CeylonPearl) {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);

        CeylonPearl token = new CeylonPearl(INITIAL_SUPPLY, CAP, admin);

        vm.stopBroadcast();

        console.log("CeylonPearl deployed at:", address(token));
        console.log("Admin:", admin);
        console.log("Initial supply:", INITIAL_SUPPLY);
        console.log("Cap:", CAP);

        return token;
    }
}
