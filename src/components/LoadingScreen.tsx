'use client';
import { useEffect, useState } from 'react';

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
      <h1 className="text-2xl font-bold text-primary mb-6">BeachRooms</h1>
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
