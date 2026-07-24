import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CONTRACT_ADDRESSES } from "../../app/utils/constants";
import tokenABI from "@/contracts/abi/CeylonPearl.json";
import { formatEther, parseEther } from "ethers";
import { toast } from "react-hot-toast";
import { useEffect, useState } from "react";

export function useToken(address?: `0x${string}`) {
  const [balance, setBalance] = useState("0");
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.token,
    abi: tokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.token,
    abi: tokenABI,
    functionName: 'totalSupply',
  });

  const { data: cap } = useReadContract({
    address: CONTRACT_ADDRESSES.token,
    abi: tokenABI,
    functionName: 'cap',
  });

  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES.token,
    abi: tokenABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.staking] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = async (amount: string) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.token,
        abi: tokenABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.staking, parseEther(amount)],
      });
      toast.success('Approval submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Approval failed');
    }
  };

  useEffect(() => {
    if (balanceData) {
      setBalance(formatEther(balanceData as bigint));
    }
  }, [balanceData]);

  return {
    balance,
    totalSupply: totalSupply ? formatEther(totalSupply as bigint) : '0',
    cap: cap ? formatEther(cap as bigint) : '0',
    allowance: allowance ? formatEther(allowance as bigint) : '0',
    refetchBalance,
    approve,
    isPending: isPending || isConfirming,
  };
}
