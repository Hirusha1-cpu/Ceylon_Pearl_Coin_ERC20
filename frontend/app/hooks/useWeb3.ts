import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export function useWeb3() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const isSepolia = chainId === sepolia.id;

  const switchToSepolia = () => {
    if (switchChain) switchChain({ chainId: sepolia.id });
  };

  return {
    address,
    isConnected,
    chainId,
    isSepolia,
    connect,
    connectors,
    disconnect,
    switchToSepolia,
  };
}