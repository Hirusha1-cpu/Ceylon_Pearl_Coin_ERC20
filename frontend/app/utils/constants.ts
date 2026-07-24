export const TOKEN_DECIMALS = 18;
export const TOKEN_SYMBOL = 'CPRL';

export const CONTRACT_ADDRESSES = {
  token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`,
  staking: process.env.NEXT_PUBLIC_STAKING_ADDRESS as `0x${string}`,
  vesting: process.env.NEXT_PUBLIC_VESTING_ADDRESS as `0x${string}`,
};

export const UNISWAP_ADDRESSES = {
  factory: process.env.NEXT_PUBLIC_UNISWAP_FACTORY as `0x${string}`,
  router: process.env.NEXT_PUBLIC_UNISWAP_ROUTER as `0x${string}`,
  WETH: process.env.NEXT_PUBLIC_WETH as `0x${string}`,
};

export const POOL_FEE = 3000;

export const SEPOLIA_CHAIN = {
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || ''] },
    public: { http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || ''] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
};
