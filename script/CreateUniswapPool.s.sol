// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IUniswapV3Factory} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Creates Uniswap V3 pool for CPRL/WETH on Sepolia
 * 
 * Run:
 *   TOKEN_ADDRESS=0x... forge script script/CreateUniswapPool.s.sol:CreateUniswapPool \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */

contract CreateUniswapPool is Script {
    address constant UNISWAP_FACTORY = 0x0227628f3F023bb0B980b67D528571c95c6DaC1c;
    // address constant WETH = 0xfff9976782d46cc05630d1f6ebab18b2324d6b14;
    address constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    address constant UNISWAP_ROUTER = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E;
    uint24 constant POOL_FEE = 3000; // 0.3%

    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");
        address admin = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);

        IUniswapV3Factory factory = IUniswapV3Factory(UNISWAP_FACTORY);

        // Check if pool already exists
        address existingPool = factory.getPool(tokenAddress, WETH, POOL_FEE);

        if (existingPool == address(0)) {
            // Create pool
            address pool = factory.createPool(tokenAddress, WETH, POOL_FEE);
            console.log("Pool created at:", pool);

            // Initialize pool with initial price: 1 CPRL = 0.001 ETH
            uint160 initialSqrtPrice = 5589179248365348838019032064; // ~0.001 ETH per CPRL
            
            IUniswapV3Pool(pool).initialize(initialSqrtPrice);
            console.log("Pool initialized with price: 1 CPRL = 0.001 ETH");
        } else {
            console.log("Pool already exists at:", existingPool);
        }
        
        // Approve router to spend tokens for adding liquidity
        IERC20 token = IERC20(tokenAddress);
        uint256 tokenAmount = 100_000 ether;
        token.approve(UNISWAP_ROUTER, tokenAmount);

        console.log("Token:", tokenAddress);
        console.log("WETH:", WETH);
        console.log("Pool Fee:", POOL_FEE);
        console.log("Add liquidity manually via Uniswap UI");

        vm.stopBroadcast();

    }
}