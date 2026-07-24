'use client';

import { useState, useEffect } from 'react';
import { useStaking } from '../hooks/useStaking';
import { useToken } from '../hooks/useToken';
import { useWeb3 } from '../hooks/useWeb3';
import { formatNumber } from '../utils/helpers';
import { TOKEN_SYMBOL } from '../utils/constants';
import toast from 'react-hot-toast';

export function StakingPanel() {
  const { address, isConnected } = useWeb3();
  const { balance, allowance, approve, refetchBalance } = useToken(address);
  const {
    stakedBalance,
    earnedRewards,
    totalStaked,
    stake,
    withdraw,
    claimReward,
    exit,
    refetchStaked,
    refetchEarned,
    isPending,
  } = useStaking(address);

  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (allowance && stakeAmount) {
      setIsApproved(parseFloat(allowance) >= parseFloat(stakeAmount));
    }
  }, [allowance, stakeAmount]);

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    await stake(stakeAmount);
    setStakeAmount('');
    refetchBalance();
    refetchStaked();
    refetchEarned();
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    await withdraw(withdrawAmount);
    setWithdrawAmount('');
    refetchStaked();
    refetchEarned();
  };

  const handleApprove = async () => {
    await approve(stakeAmount);
  };

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Connect your wallet to stake {TOKEN_SYMBOL}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        💰 Staking {TOKEN_SYMBOL}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Your Stake</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatNumber(stakedBalance)} {TOKEN_SYMBOL}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Rewards</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatNumber(earnedRewards)} {TOKEN_SYMBOL}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Staked</p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {formatNumber(totalStaked)} {TOKEN_SYMBOL}
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Stake</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
          />
          <button
            onClick={() => setStakeAmount(balance)}
            className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 rounded-lg"
          >
            Max
          </button>
          {!isApproved && parseFloat(stakeAmount) > 0 ? (
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              Approve
            </button>
          ) : (
            <button
              onClick={handleStake}
              disabled={isPending || !stakeAmount}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Stake
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Withdraw</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
          />
          <button
            onClick={() => setWithdrawAmount(stakedBalance)}
            className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 rounded-lg"
          >
            Max
          </button>
          <button
            onClick={handleWithdraw}
            disabled={isPending || !withdrawAmount}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Withdraw
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={claimReward}
          disabled={isPending || parseFloat(earnedRewards) <= 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Claim Rewards
        </button>
        <button
          onClick={exit}
          disabled={isPending || parseFloat(stakedBalance) <= 0}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          Exit
        </button>
      </div>
    </div>
  );
}