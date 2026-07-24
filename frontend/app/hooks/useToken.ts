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
}
