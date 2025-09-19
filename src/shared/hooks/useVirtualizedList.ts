import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
}

interface UseVirtualizedListReturn<T> {
	virtualItems: {
		index: number
		item: T
		offsetTop: number
	}[]
	totalHeight: number
	scrollToIndex: (index: number) => void
	containerRef: React.RefObject<HTMLDivElement | null>
}

export function useVirtualizedList<T>({
  items,
  itemHeight,
  overscan = 3,
  containerHeight = 500,
}: UseVirtualizedListProps<T>): UseVirtualizedListReturn<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(containerHeight);

  // Update container height if the ref changes
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === containerRef.current) {
            setHeight(entry.contentRect.height);
          }
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Update scroll position when container is scrolled
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate which items should be visible
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + height) / itemHeight) + overscan
  );

  // Create virtual items
  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      item: items[i],
      offsetTop: i * itemHeight,
    });
  }

  // Scroll to a specific index
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  return {
    virtualItems,
    totalHeight: items.length * itemHeight,
    scrollToIndex,
    containerRef,
  };
}