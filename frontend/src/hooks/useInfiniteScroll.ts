import { useCallback, useEffect, useRef, useState, useMemo, MutableRefObject } from 'react';
import React from 'react';
import { useGetUsersQuery } from '@/store/api/userApi';

export interface UseInfiniteScrollOptions {
  /**
   * Callback function to load more items
   */
  onLoadMore: () => void | Promise<void>;
  /**
   * Whether there are more items to load
   */
  hasMore: boolean;
  /**
   * Whether data is currently being loaded
   */
  isLoading: boolean;
  /**
   * Threshold in pixels from the bottom to trigger loading
   * @default 100
   */
  threshold?: number;
  /**
   * Root element for the intersection observer
   * @default null (viewport)
   */
  root?: Element | null;
  /**
   * Root margin for the intersection observer
   * @default '0px'
   */
  rootMargin?: string;
  /**
   * Whether the infinite scroll is enabled
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook for implementing infinite scrolling with Intersection Observer
 * @param options Configuration options for infinite scroll
 * @returns Ref to attach to the last element in the list
 */
export const useInfiniteScroll = ({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 100,
  root = null,
  rootMargin = '0px',
  enabled = true,
}: UseInfiniteScrollOptions) => {
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef(onLoadMore);

  // Update the loadMore ref when it changes
  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Callback ref for the last element
  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      // Disconnect previous observer
      if (observer.current) {
        observer.current.disconnect();
      }

      // Don't observe if loading, no more items, or disabled
      if (isLoading || !hasMore || !enabled) {
        return;
      }

      // Create new observer
      observer.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            loadMoreRef.current();
          }
        },
        {
          root,
          rootMargin: `${threshold}px ${rootMargin}`,
          threshold: 0,
        }
      );

      // Start observing the element
      if (node) {
        observer.current.observe(node);
      }
    },
    [isLoading, hasMore, enabled, threshold, root, rootMargin]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  return lastElementRef;
};

/**
 * Hook for implementing infinite scrolling with a scroll container
 * @param containerRef Reference to the scroll container
 * @param options Configuration options for infinite scroll
 */
export const useInfiniteScrollContainer = (
  containerRef: MutableRefObject<HTMLElement | null>,
  {
    onLoadMore,
    hasMore,
    isLoading,
    threshold = 100,
    enabled = true,
  }: Omit<UseInfiniteScrollOptions, 'root' | 'rootMargin'>
) => {
  const loadMoreRef = useRef(onLoadMore);

  // Update the loadMore ref when it changes
  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled || !hasMore) {
      return;
    }

    const handleScroll = () => {
      if (isLoading) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - threshold;

      if (scrolledToBottom && hasMore && !isLoading) {
        loadMoreRef.current();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, hasMore, isLoading, threshold, enabled]);
};

/**
 * Hook for implementing virtual scrolling with infinite scroll
 * Useful for large lists to improve performance
 */
export interface VirtualScrollItem {
  id: string | number;
  height: number;
}

export interface UseVirtualInfiniteScrollOptions<T> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  containerHeight: number;
  overscan?: number;
  onLoadMore: () => void | Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
}

export const useVirtualInfiniteScroll = <T extends { id: string | number }>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 100,
}: UseVirtualInfiniteScrollOptions<T>) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate item heights
  const itemHeights = useMemo(() => {
    return items.map((item, index) => {
      if (typeof itemHeight === 'function') {
        return itemHeight(item, index);
      }
      return itemHeight;
    });
  }, [items, itemHeight]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return itemHeights.reduce((sum, height) => sum + height, 0);
  }, [itemHeights]);

  // Calculate visible items
  const visibleItems = useMemo(() => {
    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = items.length - 1;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      if (accumulatedHeight + itemHeights[i] > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += itemHeights[i];
    }

    // Find end index
    accumulatedHeight = 0;
    for (let i = startIndex; i < items.length; i++) {
      if (accumulatedHeight > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
      accumulatedHeight += itemHeights[i];
    }

    // Calculate offset for visible items
    let offsetY = 0;
    for (let i = 0; i < startIndex; i++) {
      offsetY += itemHeights[i];
    }

    return {
      items: items.slice(startIndex, endIndex + 1),
      startIndex,
      endIndex,
      offsetY,
    };
  }, [items, itemHeights, scrollTop, containerHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const newScrollTop = scrollRef.current.scrollTop;
    setScrollTop(newScrollTop);

    // Check if should load more
    const scrolledToBottom = newScrollTop + containerHeight >= totalHeight - threshold;
    if (scrolledToBottom && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [containerHeight, totalHeight, threshold, hasMore, isLoading, onLoadMore]);

  return {
    scrollRef,
    visibleItems: visibleItems.items,
    totalHeight,
    offsetY: visibleItems.offsetY,
    onScroll: handleScroll,
  };
};

/**
 * Example usage in a component:
 *
 * ```tsx
 * export const InfiniteScrollExample: React.FC = () => {
 *   const [page, setPage] = useState(1);
 *   const { data, isLoading } = useGetUsersQuery({ page, limit: 20 });
 *
 *   const lastUserRef = useInfiniteScroll({
 *     onLoadMore: () => setPage(p => p + 1),
 *     hasMore: data?.hasMore || false,
 *     isLoading,
 *   });
 *
 *   return (
 *     <div>
 *       {data?.users.map((user, index) => (
 *         <div
 *           key={user.id}
 *           ref={index === data.users.length - 1 ? lastUserRef : null}
 *         >
 *           {user.name}
 *         </div>
 *       ))}
 *       {isLoading && <div>Loading...</div>}
 *     </div>
 *   );
 * };
 * ```
 */