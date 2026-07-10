'use client';

import { useEffect, useState, type RefObject } from 'react';
import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollToTopButtonProps {
  scrollRef: RefObject<HTMLElement | null>;
  className?: string;
  /** แสดงปุ่มเมื่อเลื่อนลงมากกว่าค่านี้ (px) */
  threshold?: number;
}

export default function ScrollToTopButton({
  scrollRef,
  className,
  threshold = 280,
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      setVisible(el.scrollTop > threshold);
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef, threshold]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Button
      type="button"
      size="icon"
      aria-label="เลื่อนขึ้นด้านบน"
      title="เลื่อนขึ้นด้านบน"
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-5 right-4 z-30 size-11 rounded-full border border-blue-200/80 bg-white text-blue-600 shadow-lg shadow-blue-500/15 transition-all duration-300 hover:bg-blue-50 hover:text-blue-700 sm:bottom-6 sm:right-6',
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0',
        className,
      )}
    >
      <ChevronUp className="size-5" />
    </Button>
  );
}
