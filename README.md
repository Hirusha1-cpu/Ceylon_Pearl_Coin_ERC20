# Ceylon Pearl (CPRL) — ERC20 Token System

A production-style ERC20 token with role-based minting, gasless approvals
(EIP-2612), vesting, and staking — built with Foundry, OpenZeppelin, and
audited with Slither.

## Architecture

```
CeylonPearl (ERC20 + Permit + AccessControl + Capped + Pausable)
        │
        ├── CeylonPearlVesting   (cliff + linear release for team/investors)
        └── CeylonPearlStaking   (reward-per-token checkpoint staking)
```

Roles: `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` (vesting/controlled minting),
`PAUSER_ROLE` (emergency stop), `REWARD_MANAGER_ROLE` (staking rewards).

---

## 1. Prerequisites

```bash
# Install Foundry (forge, cast, anvil) if you don't have it
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Python + Slither for static analysis
pip install slither-analyzer --break-system-packages

# Verify installs
forge --version
slither --version
```

---

## 2. Project Setup

```bash
# From inside Ceylon_Pearl_ERC20/
git init                      # if not already a git repo
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Copy env template and fill in your own values
cp .env.example .env
```

Edit `.env`:
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0xYOUR_TESTNET_ONLY_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_KEY
```

⚠️ Use a **throwaway testnet wallet** for `PRIVATE_KEY` — never your real one.

---

## 3. Build

```bash
forge build
forge build --sizes    # check contract bytecode size vs 24kb limit
```

---

## 4. Testing

```bash
# Run everything (unit + fuzz + invariant), verbose
forge test -vvv

# Run only unit tests
forge test --match-path "test/unit/*" -vvv

# Run only fuzz tests, with more runs than default
forge test --match-path "test/fuzz/*" --fuzz-runs 5000 -vvv

# Run only invariant tests, with deeper exploration
FOUNDRY_INVARIANT_RUNS=512 FOUNDRY_INVARIANT_DEPTH=100 \
  forge test --match-path "test/invariant/*" -vvv

# Run one specific test function
forge test --match-test test_RevertWhen_MintExceedsCap -vvvv

# Coverage report
forge coverage
forge coverage --report lcov          # for lcov/genhtml visual report
forge coverage --report summary       # quick terminal summary

# Gas report + snapshot (commit .gas-snapshot to repo for CI diffing)
forge snapshot
forge test --gas-report
```

---

## 5. Security Audit (Slither)

```bash
# Run Slither on the src/ folder only (ignore lib/ dependencies)
slither src/ --config-file audit/slither.config.json

# Save output to a file for the README/report
slither src/ --config-file audit/slither.config.json > audit/slither-output.txt 2>&1

# Check a single contract
slither src/CeylonPearl.sol
```

After running: open `audit/slither-output.txt`, review each finding, fix real
issues in the code, re-run Slither, and document before/after in
`audit/slither-report.md`.

---

## 6. Local Testing with Anvil (local blockchain)

```bash
# Terminal 1: start a local chain
anvil

# Terminal 2: deploy to it (anvil's default first private key)
forge script script/DeployToken.s.sol:DeployToken \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast

# Interact with the deployed contract using cast
cast call <TOKEN_ADDRESS> "totalSupply()(uint256)" --rpc-url http://127.0.0.1:8545
cast send <TOKEN_ADDRESS> "mint(address,uint256)" <TO_ADDRESS> 1000000000000000000000 \
  --private-key 0xac0974... --rpc-url http://127.0.0.1:8545
```

---

## 7. Deploy to Sepolia Testnet

```bash
# Step 1: Deploy the core token
forge script script/DeployToken.s.sol:DeployToken \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Copy the printed token address, add it to .env as TOKEN_ADDRESS, then:

# Step 2: Deploy vesting + staking, wired to that token
source .env   # reload env with TOKEN_ADDRESS set
forge script script/DeployVestingAndStaking.s.sol:DeployVestingAndStaking \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Verify manually (if --verify flag fails)

```bash
forge verify-contract <TOKEN_ADDRESS> src/CeylonPearl.sol:CeylonPearl \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(uint256,uint256,address)" \
    1000000000000000000000000 10000000000000000000000000 <ADMIN_ADDRESS>)
```

---

## 8. Interacting with the Deployed Contract (cast)

```bash
# Read total supply
cast call <TOKEN_ADDRESS> "totalSupply()(uint256)" --rpc-url $SEPOLIA_RPC_URL

# Read your balance
cast call <TOKEN_ADDRESS> "balanceOf(address)(uint256)" <YOUR_ADDRESS> --rpc-url $SEPOLIA_RPC_URL

# Transfer tokens
cast send <TOKEN_ADDRESS> "transfer(address,uint256)" <TO_ADDRESS> 1000000000000000000 \
  --private-key $PRIVATE_KEY --rpc-url $SEPOLIA_RPC_URL

# Approve staking contract
cast send <TOKEN_ADDRESS> "approve(address,uint256)" <STAKING_ADDRESS> 1000000000000000000 \
  --private-key $PRIVATE_KEY --rpc-url $SEPOLIA_RPC_URL

# Stake
cast send <STAKING_ADDRESS> "stake(uint256)" 1000000000000000000 \
  --private-key $PRIVATE_KEY --rpc-url $SEPOLIA_RPC_URL
```

---

## 9. CI/CD

`.github/workflows/ci.yml` runs automatically on every push/PR:
1. `forge build`
2. `forge test` (unit + fuzz + invariant)
3. `forge coverage`
4. `forge snapshot --check` (fails if gas usage regresses)
5. Slither (fails build on high-severity findings)

To test the CI workflow locally before pushing:
```bash
forge build --sizes && forge test -vvv && forge coverage --report summary
```

---

## Repo layout

```
Ceylon_Pearl_ERC20/
├── src/                    # contracts
├── script/                 # forge deployment scripts
├── test/
│   ├── unit/                # isolated function tests
│   ├── fuzz/                 # random-input property tests
│   └── invariant/             # always-true property tests + handler
├── audit/                  # Slither config + findings report
├── .github/workflows/      # CI pipeline
└── foundry.toml
```
