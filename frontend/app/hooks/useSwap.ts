import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES, UNISWAP_ADDRESSES, POOL_FEE } from '../../app/utils/constants';
import { formatEther, parseEther } from 'ethers';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import tokenABI from '@/contracts/abi/CeylonPearl.json';
import routerABI from '@/contracts/abi/IUniswapV3Router.json';
import poolABI from '@/contracts/abi/UniswapV3Pool.json';

export function useSwap(address?: `0x${string}`) {
  const [quoteAmount, setQuoteAmount] = useState('0');
  const [price, setPrice] = useState('0');
  const [slippage, setSlippage] = useState(0.5);

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

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (slot0) {
      const sqrtPriceX96 = slot0[0] as bigint;
      const price = Number(sqrtPriceX96) / 2 ** 96;
      const formattedPrice = (price * price).toFixed(6);
      setPrice(formattedPrice);
    }
  }, [slot0]);

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

    let quote: string;
    if (isBuying) {
      quote = (parseFloat(amountIn) / currentPrice).toString();
    } else {
      quote = (parseFloat(amountIn) * currentPrice).toString();
    }
    setQuoteAmount(quote);
  };

  const swap = async (amountIn: string, isBuying: boolean) => {
    try {
       const amount = parseEther(amountIn);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const slippageMultiplier = 1 - slippage / 100;
      const estimatedOut = parseEther(quoteAmount);
      const minOut = BigInt(Math.floor(Number(estimatedOut) * slippageMultiplier));

       if (isBuying) {
        await writeContract({
          address: UNISWAP_ADDRESSES.router,
          abi: routerABI,
          functionName: 'exactInputSingle',
          args: [{
            tokenIn: UNISWAP_ADDRESSES.WETH,
            tokenOut: CONTRACT_ADDRESSES.token,
            fee: POOL_FEE,
            recipient: address,
            deadline: BigInt(deadline),
            amountIn: amount,
            amountOutMinimum: minOut,
            sqrtPriceLimitX96: 0,
          }],
          value: amount,
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
            deadline: BigInt(deadline),
            amountIn: amount,
            amountOutMinimum: minOut,
            sqrtPriceLimitX96: 0,
          }],
        });
        toast.success('Selling CPRL submitted');
      }



    } catch (error) {
        toast.error(error?.message || 'Swap failed');
    }
  }

  const approveForSwap = async (amount: string) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.token,
        abi: tokenABI,
        functionName: 'approve',
        args: [UNISWAP_ADDRESSES.router, parseEther(amount)],
      });
      toast.success('Approved for swap');
    } catch (error: any) {
      toast.error(error?.message || 'Approval failed');
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