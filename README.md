# 🪷 Ceylon Pearl (CPRL) — ERC20 Token System

A production-style ERC20 token with role-based minting, gasless approvals (EIP-2612), linear vesting, checkpoint-based staking, and Uniswap V3 integration — built with Foundry, OpenZeppelin, and a Next.js + wagmi frontend.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://ceylon-pearl-coin-erc-20-orcin.vercel.app/)
[![Network](https://img.shields.io/badge/Network-Sepolia%20Testnet-627EEA?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io/)

---

## 🌐 Live Demo

**App URL:** [https://ceylon-pearl-coin-erc-20-orcin.vercel.app/](https://ceylon-pearl-coin-erc-20-orcin.vercel.app/)

> Connect a Sepolia-testnet wallet (MetaMask) to try wallet connect, staking, vesting release, and swapping CPRL ↔ ETH via the embedded Uniswap V3 pool.

---

## 📜 Deployed Contracts (Sepolia Testnet)

| Contract | Address | Etherscan |
|---|---|---|
| **CeylonPearl (CPRL) Token** | `0xceF32E08B51e773ee5168Ef77680796482D9F17c` | [View / Verify](https://sepolia.etherscan.io/address/0xceF32E08B51e773ee5168Ef77680796482D9F17c#code) |
| **CeylonPearlStaking** | `0xcB7143da9141e06AF46036dBA60a6d44D88dE99f` | [View / Verify](https://sepolia.etherscan.io/address/0xcB7143da9141e06AF46036dBA60a6d44D88dE99f#code) |
| **CeylonPearlVesting** | `0x5bAD373a524cE1A975Fc5b36E1859375F88C77D2` | [View / Verify](https://sepolia.etherscan.io/address/0x5bAD373a524cE1A975Fc5b36E1859375F88C77D2#code) |
| **CPRL/WETH Uniswap V3 Pool** | `0x37BAC91E9a589B4E9a5dDdC5A8453dC18EfA4677` | [View Pool](https://sepolia.etherscan.io/address/0x37BAC91E9a589B4E9a5dDdC5A8453dC18EfA4677) |

### Uniswap V3 Infrastructure Used (Sepolia)

| Component | Address |
|---|---|
| Uniswap V3 Factory | `0x0227628f3F023bb0B980b67D528571c95c6DaC1c` |
| SwapRouter02 | `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E` |
| WETH9 | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` |

Pool fee tier: **0.3%** · Initial price: **1 CPRL = 0.001 ETH**

> ℹ️ Click **"View / Verify"** above — if the contract shows a green checkmark it's already verified and you can read the full source directly on Etherscan. If it shows as unverified, see [Contract Verification](#-contract-verification) below to verify it yourself.

--

## 🏗 Architecture

```
CeylonPearl (ERC20 + Permit + AccessControl + Capped + Pausable)
        │
        ├── CeylonPearlVesting   (cliff + linear release for team/investors)
        └── CeylonPearlStaking   (reward-per-token checkpoint staking)
        │
        └── Uniswap V3 Pool (CPRL/WETH, 0.3% fee)
```

**Roles:** `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` (controlled minting), `PAUSER_ROLE` (emergency stop), `REWARD_MANAGER_ROLE` (staking rewards).

**Frontend stack:** Next.js 16, wagmi + viem, RainbowKit (wallet connect), Uniswap V3 SwapRouter02 integration.

--

## 🧪 Testing

The contracts are covered by unit, fuzz, and invariant tests using Foundry:

```bash
forge test -vvv                                    # everything
forge test --match-path "test/unit/*" -vvv          # unit tests
forge test --match-path "test/fuzz/*" --fuzz-runs 5000 -vvv
forge test --match-path "test/invariant/*" -vvv     # invariants (cap, balance conservation)
forge coverage --report summary
```

Static analysis via [Slither](https://github.com/crytic/slither):

```bash
slither src/ --config-file audit/slither.config.json
```

--

## 🚀 Local Setup

### Contracts (Foundry)

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
cp .env.example .env   # fill in your own RPC URL, private key, Etherscan API key
forge build
```

### Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in contract addresses + WalletConnect project ID
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

--

## ✅ Contract Verification

If a contract above shows as **unverified** on Etherscan, verify it with:

```bash
forge verify-contract <CONTRACT_ADDRESS> src/CeylonPearl.sol:CeylonPearl \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(uint256,uint256,address)" \
    <INITIAL_SUPPLY> <CAP> <ADMIN_ADDRESS>)
```

Repeat with the matching contract path/name and constructor args for `CeylonPearlStaking` and `CeylonPearlVesting`. Constructor argument types for each:

- `CeylonPearl(uint256 initialSupply, uint256 cap_, address admin)`
- `CeylonPearlStaking(address stakingToken_, address rewardToken_, address admin)`
- `CeylonPearlVesting(address tokenAddress, address admin)`

-

## ⚠️ Testnet Disclaimer

This project is deployed on **Sepolia testnet only** and uses no real funds. Do not send mainnet ETH or reuse a mainnet private key for this project.

--

## 📄 License

MIT