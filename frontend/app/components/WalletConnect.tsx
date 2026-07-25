'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';

export function WalletConnect() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="flex items-center gap-4 h-[42px]" />;
  }

  return (
    <div className="flex items-center gap-4">
      <ConnectButton />
    </div>
  );
}