'use client';

import React, { ReactNode, useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ScrollToTopButton from './ScrollToTopButton';

interface AppLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export default function AppLayout({ children, fullWidth }: AppLayoutProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const currentZoom =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--admin-zoom') || '1') *
      100;
    setZoomLevel(currentZoom);

    const interval = setInterval(() => {
      const newZoom =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--admin-zoom') || '1') *
        100;
      setZoomLevel((prev) => (Math.abs(newZoom - prev) > 0.1 ? newZoom : prev));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-rose-50/30 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Navbar />

        <main ref={mainRef} className="relative flex-1 overflow-y-auto" style={{ zoom: zoomLevel / 100 }}>
          <div
            className={
              fullWidth
                ? 'w-full max-w-full px-4 sm:px-6 lg:px-8 py-6'
                : 'container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl'
            }
          >
            {children}
          </div>
          <ScrollToTopButton scrollRef={mainRef} />
        </main>
      </div>
    </div>
  );
}
