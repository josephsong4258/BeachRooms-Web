'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LoadingScreenProps {
  show: boolean;
  onExited: () => void;
  error?: string | null;
}

export default function LoadingScreen({ show, onExited, error }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      const t = setTimeout(onExited, 300);
      return () => clearTimeout(t);
    }
  }, [show, onExited]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <Image
        src="/assets/logo/logo.png"
        alt="BeachRooms"
        width={280}
        height={56}
        priority
        className="mb-6 h-12 w-auto dark:hidden"
      />
      <Image
        src="/assets/logo/logo_dark.png"
        alt="BeachRooms"
        width={280}
        height={56}
        priority
        className="mb-6 hidden h-12 w-auto dark:block"
      />
      {error ? (
        <div className="rounded-md bg-destructive/10 border border-destructive px-4 py-3 text-destructive text-sm max-w-xs text-center">
          {error}
        </div>
      ) : (
        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full loading-bar" />
        </div>
      )}
    </div>
  );
}
