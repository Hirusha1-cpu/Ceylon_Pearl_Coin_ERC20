'use client';

import { useState, useEffect } from 'react';
import { useSwap } from '../hooks/useSwap';
import { useWeb3 } from '../hooks/useWeb3';
import { useToken } from '../hooks/useToken';
import { formatNumber } from '../utils/helpers';
import { TOKEN_SYMBOL } from '../utils/constants';
import toast from 'react-hot-toast';
import { ArrowUpDown, Settings, RefreshCw } from 'lucide-react';

export function SwapPanel() {
  const { address, isConnected } = useWeb3();
  const { balance } = useToken(address);
  const {
    price,
    quoteAmount,
    isPending,
    tokenBalance,
    wethBalance,
    routerAllowance, // <-- correct allowance, scoped to the swap router
    slippage,
    setSlippage,
    getQuote,
    swap,
    approveForSwap,
  } = useSwap(address);

  const [isBuying, setIsBuying] = useState(true);
  const [amount, setAmount] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (amount && !isBuying) {
      const allowanceAmount = parseFloat(routerAllowance || '0');
      setIsApproved(allowanceAmount >= parseFloat(amount));
    } else {
      setIsApproved(true);
    }
  }, [amount, routerAllowance, isBuying]);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      getQuote(amount, isBuying);
    }
  }, [amount, isBuying, price]);

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    await swap(amount, isBuying);
    setAmount('');
  };

  const handleApprove = async () => {
    await approveForSwap(amount);
  };

  const handleFlip = () => {
    setIsBuying(!isBuying);
    setAmount('');
  };

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Connect your wallet to trade {TOKEN_SYMBOL}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          💱 Swap {TOKEN_SYMBOL}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Settings size={18} className="text-gray-500" />
          </button>
          <button
            onClick={() => amount && getQuote(amount, isBuying)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCw size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            Slippage: {slippage}%
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value))}
            className="w-full mt-1"
          />
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">1 {TOKEN_SYMBOL} =</p>
        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {price ? `${Number(price).toFixed(6)} ETH` : 'Loading...'}
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-2">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>{isBuying ? 'Pay with' : 'Sell'}</span>
          <span>Balance: {formatNumber(isBuying ? wethBalance : tokenBalance)}</span>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-transparent text-2xl font-bold outline-none"
          />
          <button
            onClick={() => setAmount(isBuying ? wethBalance : tokenBalance)}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"
          >
            MAX
          </button>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {isBuying ? 'ETH' : TOKEN_SYMBOL}
        </div>
      </div>

      <div className="flex justify-center -my-2 relative z-10">
        <button
          onClick={handleFlip}
          className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full hover:bg-gray-300 border-4 border-white dark:border-gray-800"
        >
          <ArrowUpDown size={20} />
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-2">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>{isBuying ? 'Receive' : 'Pay with'}</span>
          <span>Balance: {formatNumber(isBuying ? tokenBalance : wethBalance)}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {quoteAmount ? formatNumber(quoteAmount) : '0.0'}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {isBuying ? TOKEN_SYMBOL : 'ETH'}
        </div>
      </div>

      <button
        onClick={isBuying ? handleSwap : (isApproved ? handleSwap : handleApprove)}
        disabled={isPending || !amount || parseFloat(amount) <= 0}
        className={`w-full mt-4 py-3 rounded-lg font-semibold text-white ${
          isBuying
            ? 'bg-blue-600 hover:bg-blue-700'
            : isApproved
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-yellow-500 hover:bg-yellow-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPending
          ? 'Processing...'
          : isBuying
          ? `Buy ${TOKEN_SYMBOL}`
          : isApproved
          ? `Sell ${TOKEN_SYMBOL}`
          : 'Approve for Swap'}
      </button>
    </div>
  );
}