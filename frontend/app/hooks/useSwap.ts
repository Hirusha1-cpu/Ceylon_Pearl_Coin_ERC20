import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES, UNISWAP_ADDRESSES, POOL_FEE } from '../../app/utils/constants';
import { formatEther, parseEther } from 'ethers';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import tokenABI from '@/contracts/abi/CeylonPearl.json';
import poolABI from '@/contracts/abi/UniswapV3Pool.json';

// SwapRouter02 ABI - NO deadline field (this is the fix)
const routerABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn', type: 'address' },
          { internalType: 'address', name: 'tokenOut', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' },
          { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        internalType: 'struct ISwapRouter.ExactInputSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactInputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'refundETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes[]', name: 'data', type: 'bytes[]' }],
    name: 'multicall',
    outputs: [{ internalType: 'bytes[]', name: 'results', type: 'bytes[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export function useSwap(address?: `0x${string}`) {
  const [quoteAmount, setQuoteAmount] = useState('0');
  const [price, setPrice] = useState('0');
  const [slippage, setSlippage] = useState(0.5);
  const [isToken0, setIsToken0] = useState(true); // is CPRL token0?

  const { data: tokenBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.token,
    abi: tokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: wethBalance } = useReadContract({
    address: UNISWAP_ADDRESSES.WETH,
    abi: tokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: poolAddress } = useReadContract({
    address: UNISWAP_ADDRESSES.factory,
    abi: [
      {
        inputs: [
          { internalType: 'address', name: 'tokenA', type: 'address' },
          { internalType: 'address', name: 'tokenB', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
        ],
        name: 'getPool',
        outputs: [{ internalType: 'address', name: 'pool', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'getPool',
    args: [CONTRACT_ADDRESSES.token, UNISWAP_ADDRESSES.WETH, POOL_FEE],
  });

  const { data: slot0 } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: poolABI,
    functionName: 'slot0',
    query: { enabled: !!poolAddress },
  });

  // Figure out token order so price direction is always correct
  useEffect(() => {
    if (CONTRACT_ADDRESSES.token && UNISWAP_ADDRESSES.WETH) {
      setIsToken0(
        CONTRACT_ADDRESSES.token.toLowerCase() < UNISWAP_ADDRESSES.WETH.toLowerCase()
      );
    }
  }, []);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (slot0) {
      const sqrtPriceX96 = slot0[0] as bigint;
      const rawPrice = (Number(sqrtPriceX96) / 2 ** 96) ** 2; // token1 per token0

      // If CPRL is token0, raw price = ETH per CPRL (what we want directly)
      // If CPRL is token1, raw price = CPRL per ETH, so invert it
      const cprlPerEth = isToken0 ? rawPrice : 1 / rawPrice;
      setPrice(cprlPerEth.toFixed(10));
    }
  }, [slot0, isToken0]);

  const getQuote = async (amountIn: string, isBuying: boolean) => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setQuoteAmount('0');
      return;
    }
    const currentPrice = parseFloat(price);
    if (currentPrice === 0) {
      setQuoteAmount('0');
      return;
    }

    // price = ETH per CPRL
    let quote: string;
    if (isBuying) {
      // paying ETH, receiving CPRL
      quote = (parseFloat(amountIn) / currentPrice).toString();
    } else {
      // paying CPRL, receiving ETH
      quote = (parseFloat(amountIn) * currentPrice).toString();
    }
    setQuoteAmount(quote);
  };

  const swap = async (amountIn: string, isBuying: boolean) => {
    try {
      const amount = parseEther(amountIn);
      const estimatedOut = parseEther(quoteAmount || '0');

      // do slippage math in BigInt to avoid precision loss
      const slippageBps = BigInt(Math.floor(slippage * 100)); // e.g. 0.5% -> 50
      const minOut = estimatedOut - (estimatedOut * slippageBps) / 10000n;

      if (isBuying) {
        // Paying with native ETH -> tokenIn is WETH, router auto-wraps
        // when value is sent and tokenIn === WETH (SwapRouter02 behavior)
        await writeContract({
          address: UNISWAP_ADDRESSES.router,
          abi: routerABI,
          functionName: 'exactInputSingle',
          args: [{
            tokenIn: UNISWAP_ADDRESSES.WETH,
            tokenOut: CONTRACT_ADDRESSES.token,
            fee: POOL_FEE,
            recipient: address,
            amountIn: amount,
            amountOutMinimum: minOut,
            sqrtPriceLimitX96: 0n,
          }],
          value: amount,
          gas: 400000n, // explicit gas limit - avoids MetaMask's broken auto-estimate fallback
        });
        toast.success('Buying CPRL submitted');
      } else {
        await writeContract({
          address: UNISWAP_ADDRESSES.router,
          abi: routerABI,
          functionName: 'exactInputSingle',
          args: [{
            tokenIn: CONTRACT_ADDRESSES.token,
            tokenOut: UNISWAP_ADDRESSES.WETH,
            fee: POOL_FEE,
            recipient: address,
            amountIn: amount,
            amountOutMinimum: minOut,
            sqrtPriceLimitX96: 0n,
          }],
          gas: 400000n, // explicit gas limit - avoids MetaMask's broken auto-estimate fallback
        });
        toast.success('Selling CPRL submitted');
      }
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || 'Swap failed');
    }
  };

  const approveForSwap = async (amount: string) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.token,
        abi: tokenABI,
        functionName: 'approve',
        args: [UNISWAP_ADDRESSES.router, parseEther(amount)],
        gas: 100000n, // explicit gas limit for ERC20 approve
      });
      toast.success('Approved for swap');
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || 'Approval failed');
    }
  };

  return {
    price,
    quoteAmount,
    isPending: isPending || isConfirming,
    tokenBalance: tokenBalance ? formatEther(tokenBalance as bigint) : '0',
    wethBalance: wethBalance ? formatEther(wethBalance as bigint) : '0',
    slippage,
    setSlippage,
    getQuote,
    swap,
    approveForSwap,
  };
}