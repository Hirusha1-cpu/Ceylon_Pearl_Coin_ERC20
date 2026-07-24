'use client';

import { useToken } from '../hooks/useToken';
import { useWeb3 } from '../hooks/useWeb3';
import { formatNumber } from '../utils/helpers';
import { TOKEN_SYMBOL } from '../utils/constants';

export function TokenInfo() {
  const { address } = useWeb3();
  const { balance, totalSupply, cap } = useToken(address);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        {TOKEN_SYMBOL} Token Info
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Your Balance</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatNumber(balance)} {TOKEN_SYMBOL}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Supply</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatNumber(totalSupply)} {TOKEN_SYMBOL}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Maximum Cap</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatNumber(cap)} {TOKEN_SYMBOL}
          </p>
        </div>
      </div>
    </div>
  );
}