import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/utils/constants';
import vestingABI from '@/contracts/abi/CeylonPearlVesting.json';
import { formatEther } from 'ethers';
import { toast } from 'react-hot-toast';

export function useVesting(address?: `0x${string}`) {
    const { data: schedule, refetch: refetchSchedule } = useReadContract({
    address: CONTRACT_ADDRESSES.vesting,
    abi: vestingABI,
    functionName: 'schedules',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: releasableAmount, refetch: refetchReleasable } = useReadContract({
    address: CONTRACT_ADDRESSES.vesting,
    abi: vestingABI,
    functionName: 'releasableAmount',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const release = async () => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.vesting,
        abi: vestingABI,
        functionName: 'release',
        args: [],
      });
      toast.success('Release submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Release failed');
    }
  };

  const formatSchedule = () => {
    if (!schedule) return null;
    const [totalAmount, released, start, cliffDuration, vestingDuration, revocable, revoked] =
      schedule as any[];
    return {
      totalAmount: formatEther(totalAmount),
      released: formatEther(released),
      start: Number(start),
      cliffDuration: Number(cliffDuration),
      vestingDuration: Number(vestingDuration),
      revocable,
      revoked,
    };
  };

  return {
    schedule: formatSchedule(),
    releasableAmount: releasableAmount ? formatEther(releasableAmount as bigint) : '0',
    refetchSchedule,
    refetchReleasable,
    release,
    isPending: isPending || isConfirming,
  };
}