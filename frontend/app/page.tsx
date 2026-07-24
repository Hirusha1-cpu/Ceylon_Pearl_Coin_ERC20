'use client';

import { WalletConnect } from '../app/components/WalletConnect';
import { TokenInfo } from '../app/components/TokenInfo';
import { StakingPanel } from '../app/components/StakingPanel';
import { VestingPanel } from '../app/components/VestingPanel';
import { SwapPanel } from '../app/components/SwapPanel';
import { useWeb3 } from '../app/hooks/useWeb3';

export default function Home() {
  const { isConnected, isSepolia, switchToSepolia } = useWeb3();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              🪷 Ceylon Pearl
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              CPRL Token Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isConnected && (
              <button
                onClick={switchToSepolia}
                className={`px-3 py-1 text-xs rounded-full ${
                  isSepolia
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Sepolia
              </button>
            )}
            <WalletConnect />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <SwapPanel />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <TokenInfo />
            <StakingPanel />
            <VestingPanel />
          </div>
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Built with ❤️ for the Ceylon Pearl community</p>
        </footer>
      </div>
    </main>
  );
}