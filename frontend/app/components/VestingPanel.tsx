'use client';

import { useVesting } from '../hooks/useVesting';
import { useWeb3 } from '../hooks/useWeb3';
import { formatNumber } from '../utils/helpers';
import { TOKEN_SYMBOL } from '../utils/constants';

export function VestingPanel() {
  const { address, isConnected } = useWeb3();
  const { schedule, releasableAmount, release, isPending } = useVesting(address);

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Connect your wallet to view vesting
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        📋 Vesting Dashboard
      </h2>

      {schedule && schedule.totalAmount > '0' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Allocation</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(schedule.totalAmount)} {TOKEN_SYMBOL}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Released</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatNumber(schedule.released)} {TOKEN_SYMBOL}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatNumber(releasableAmount)} {TOKEN_SYMBOL}
              </p>
            </div>
          </div>

          <button
            onClick={release}
            disabled={isPending || parseFloat(releasableAmount) <= 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Release Available Tokens
          </button>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No vesting schedule found</p>
        </div>
      )}
    </div>
  );
}