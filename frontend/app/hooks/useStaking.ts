import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../../app/utils/constants';
import stakingABI from '@/contracts/abi/CeylonPearlStaking.json';
import { formatEther, parseEther } from 'ethers';
import { toast } from 'react-hot-toast';
import { useEffect, useState } from 'react';

export function useStaking(address?: `0x${string}`) {
    const [stakedBalance, setStakedBalance] = useState('0');
    const [earnedRewards, setEarnedRewards] = useState('0');

    const { data: stakedData, refetch: refetchStaked } = useReadContract({
    address: CONTRACT_ADDRESSES.staking,
    abi: stakingABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: earnedData, refetch: refetchEarned } = useReadContract({
    address: CONTRACT_ADDRESSES.staking,
    abi: stakingABI,
    functionName: 'earned',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: totalStaked } = useReadContract({
    address: CONTRACT_ADDRESSES.staking,
    abi: stakingABI,
    functionName: 'totalStaked',
  });

  const { data: rewardRate } = useReadContract({
    address: CONTRACT_ADDRESSES.staking,
    abi: stakingABI,
    functionName: 'rewardRate',
  });

   const { data: periodFinish } = useReadContract({
    address: CONTRACT_ADDRESSES.staking,
    abi: stakingABI,
    functionName: 'periodFinish',
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const stake = async (amount: string) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.staking,
        abi: stakingABI,
        functionName: 'stake',
        args: [parseEther(amount)],
      });
      toast.success('Stake submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Stake failed');
    }
  };

  const withdraw = async (amount: string) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.staking,
        abi: stakingABI,
        functionName: 'withdraw',
        args: [parseEther(amount)],
      });
      toast.success('Withdraw submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Withdraw failed');
    }
  };

  const claimReward = async () => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.staking,
        abi: stakingABI,
        functionName: 'claimReward',
        args: [],
      });
      toast.success('Claim submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Claim failed');
    }
  };

  const exit = async () => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.staking,
        abi: stakingABI,
        functionName: 'exit',
        args: [],
      });
      toast.success('Exit submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Exit failed');
    }
  };

  useEffect(() => {
    if (stakedData) setStakedBalance(formatEther(stakedData as bigint));
    if (earnedData) setEarnedRewards(formatEther(earnedData as bigint));
  }, [stakedData, earnedData]);

  return {
    stakedBalance,
    earnedRewards,
    totalStaked: totalStaked ? formatEther(totalStaked as bigint) : '0',
    rewardRate: rewardRate ? formatEther(rewardRate as bigint) : '0',
    periodFinish: periodFinish ? Number(periodFinish) : 0,
    refetchStaked,
    refetchEarned,
    stake,
    withdraw,
    claimReward,
    exit,
    isPending: isPending || isConfirming,
  };

}