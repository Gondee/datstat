import { useCallback, useEffect, useMemo, useRef } from 'react';

// Debounce hook for input optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for scroll/resize events
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const timeout = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall.current;

      if (timeSinceLastCall >= delay) {
        lastCall.current = now;
        callback(...args);
      } else {
        if (timeout.current) clearTimeout(timeout.current);
        
        timeout.current = setTimeout(() => {
          lastCall.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    }) as T,
    [callback, delay]
  );
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = useMemo(
    () => Math.max(0, Math.floor(scrollTop / itemHeight) - overscan),
    [scrollTop, itemHeight, overscan]
  );

  const endIndex = useMemo(
    () => Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    ),
    [scrollTop, containerHeight, itemHeight, overscan, items.length]
  );

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex + 1),
    [items, startIndex, endIndex]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    setScrollTop
  };
}

// Performance observer for React components
export class ComponentPerformanceObserver {
  private measurements = new Map<string, number[]>();
  private renderCounts = new Map<string, number>();

  measureRender(componentName: string, duration: number): void {
    const measurements = this.measurements.get(componentName) || [];
    measurements.push(duration);
    
    if (measurements.length > 100) {
      measurements.shift();
    }
    
    this.measurements.set(componentName, measurements);
    this.renderCounts.set(
      componentName,
      (this.renderCounts.get(componentName) || 0) + 1
    );
  }

  getStats(componentName: string) {
    const measurements = this.measurements.get(componentName) || [];
    const renderCount = this.renderCounts.get(componentName) || 0;
    
    if (measurements.length === 0) {
      return null;
    }
    
    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const max = Math.max(...measurements);
    const min = Math.min(...measurements);
    
    return {
      renderCount,
      avgRenderTime: avg,
      maxRenderTime: max,
      minRenderTime: min,
      measurements
    };
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    
    for (const [component] of this.measurements) {
      stats[component] = this.getStats(component);
    }
    
    return stats;
  }
}

export const componentObserver = new ComponentPerformanceObserver();

// Performance monitoring HOC
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return React.memo((props: P) => {
    const startTime = useRef(performance.now());

    useEffect(() => {
      const renderTime = performance.now() - startTime.current;
      componentObserver.measureRender(componentName, renderTime);
    });

    return <Component {...props} />;
  });
}

// Image optimization component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: string;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  lazy = true,
  placeholder,
  className
}: OptimizedImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const isVisible = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  const shouldLoad = !lazy || isVisible;

  return (
    <div className={className} style={{ position: 'relative', width, height }}>
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            filter: 'blur(10px)',
            transform: 'scale(1.1)'
          }}
        />
      )}
      
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6'
          }}
        >
          Failed to load image
        </div>
      )}
      
      <img
        ref={imgRef}
        src={shouldLoad ? src : undefined}
        alt={alt}
        width={width}
        height={height}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </div>
  );
}

// Memo comparison function for complex objects
export function arePropsEqual<T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  keys?: (keyof T)[]
): boolean {
  const keysToCheck = keys || Object.keys(prevProps);
  
  for (const key of keysToCheck) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  
  return true;
}

// Worker manager for offloading heavy computations
export class WorkerManager {
  private workers: Worker[] = [];
  private taskQueue: Array<{ id: string; task: any; resolve: Function }> = [];
  private busyWorkers = new Set<Worker>();

  constructor(workerScript: string, poolSize: number = 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);
    }
  }

  async execute<T>(task: any): Promise<T> {
    return new Promise((resolve) => {
      const taskId = `task_${Date.now()}_${Math.random()}`;
      this.taskQueue.push({ id: taskId, task, resolve });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;
    
    const availableWorker = this.workers.find(w => !this.busyWorkers.has(w));
    if (!availableWorker) return;
    
    const { id, task, resolve } = this.taskQueue.shift()!;
    this.busyWorkers.add(availableWorker);
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data.id === id) {
        resolve(event.data.result);
        availableWorker.removeEventListener('message', handleMessage);
        this.busyWorkers.delete(availableWorker);
        this.processQueue();
      }
    };
    
    availableWorker.addEventListener('message', handleMessage);
    availableWorker.postMessage({ id, task });
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.busyWorkers.clear();
  }
}

// React import for the hooks
import * as React from 'react';