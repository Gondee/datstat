'use client';

import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  useDebounce, 
  useThrottle, 
  useIntersectionObserver,
  withPerformanceMonitoring 
} from '@/lib/performance/frontend-optimization';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

interface DataPoint {
  timestamp: string | number;
  value: number;
  [key: string]: any;
}

interface OptimizedChartProps {
  data: DataPoint[];
  type?: 'line' | 'area';
  dataKey?: string;
  height?: number;
  throttleUpdates?: boolean;
  lazyLoad?: boolean;
  formatValue?: (value: number) => string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

// Memoized tooltip component
const CustomTooltip = memo(({ active, payload, label, formatValue }: any) => {
  if (!active || !payload || !payload[0]) return null;

  return (
    <div className="bg-[color:var(--terminal-bg)] border border-[color:var(--terminal-border)] p-3 rounded shadow-lg">
      <p className="text-[color:var(--terminal-accent)] font-bold text-sm mb-1">
        {label}
      </p>
      <div className="space-y-1 text-xs">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-3">
            <span className="text-[color:var(--terminal-text-secondary)]">
              {entry.name}:
            </span>
            <span className="text-[color:var(--terminal-text-primary)] font-mono">
              {formatValue ? formatValue(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

// Main chart component
const OptimizedChartComponent: React.FC<OptimizedChartProps> = ({
  data,
  type = 'line',
  dataKey = 'value',
  height = 300,
  throttleUpdates = true,
  lazyLoad = true,
  formatValue = (v) => v.toFixed(2),
  color = 'var(--terminal-accent)',
  showGrid = true,
  showLegend = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<Element>(null);
  const isVisible = useIntersectionObserver(observerRef, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  // Callback ref to set both refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    observerRef.current = node;
  }, []);

  // Debounce data updates if throttling is enabled
  const debouncedData = useDebounce(data, throttleUpdates ? 500 : 0);

  // Memoize chart data processing
  const processedData = useMemo(() => {
    if (!debouncedData || debouncedData.length === 0) return [];
    
    // Downsample data if too many points
    if (debouncedData.length > 500) {
      const step = Math.ceil(debouncedData.length / 500);
      return debouncedData.filter((_, index) => index % step === 0);
    }
    
    return debouncedData;
  }, [debouncedData]);

  // Memoize axis formatters
  const xAxisFormatter = useCallback((value: any) => {
    if (typeof value === 'number' && value > 1000000000) {
      // Assume it's a timestamp
      return new Date(value).toLocaleDateString();
    }
    return value;
  }, []);

  const yAxisFormatter = useCallback((value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  }, []);

  // Don't render if lazy loading is enabled and not visible
  if (lazyLoad && !isVisible) {
    return (
      <div 
        ref={setRefs} 
        className={className}
        style={{ height, backgroundColor: 'var(--terminal-bg-dark)' }}
      >
        <div className="flex items-center justify-center h-full text-[color:var(--terminal-text-secondary)]">
          Loading chart...
        </div>
      </div>
    );
  }

  const ChartComponent = type === 'area' ? AreaChart : LineChart;

  return (
    <div ref={setRefs} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent
          data={processedData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--terminal-border)" 
              opacity={0.3} 
            />
          )}
          <XAxis 
            dataKey="timestamp" 
            stroke="var(--terminal-text-secondary)"
            tick={{ fontSize: 11 }}
            tickFormatter={xAxisFormatter}
          />
          <YAxis 
            stroke="var(--terminal-text-secondary)"
            tick={{ fontSize: 11 }}
            tickFormatter={yAxisFormatter}
          />
          <Tooltip 
            content={
              <CustomTooltip formatValue={formatValue} />
            }
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
            />
          )}
          {type === 'area' ? (
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.3}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          ) : (
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

// Export with performance monitoring
export const OptimizedChart = withPerformanceMonitoring(
  memo(OptimizedChartComponent, (prevProps, nextProps) => {
    // Custom comparison to avoid unnecessary re-renders
    return (
      prevProps.type === nextProps.type &&
      prevProps.dataKey === nextProps.dataKey &&
      prevProps.height === nextProps.height &&
      prevProps.color === nextProps.color &&
      prevProps.data.length === nextProps.data.length &&
      // Deep comparison for first and last data points
      JSON.stringify(prevProps.data[0]) === JSON.stringify(nextProps.data[0]) &&
      JSON.stringify(prevProps.data[prevProps.data.length - 1]) === 
        JSON.stringify(nextProps.data[nextProps.data.length - 1])
    );
  }),
  'OptimizedChart'
);

// Multi-series optimized chart
interface MultiSeriesChartProps {
  data: DataPoint[];
  series: Array<{
    dataKey: string;
    name: string;
    color: string;
    type?: 'line' | 'area';
  }>;
  height?: number;
  throttleUpdates?: boolean;
  lazyLoad?: boolean;
  formatValue?: (value: number) => string;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

const MultiSeriesChartComponent: React.FC<MultiSeriesChartProps> = ({
  data,
  series,
  height = 400,
  throttleUpdates = true,
  lazyLoad = true,
  formatValue = formatCurrency,
  showGrid = true,
  showLegend = true,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<Element>(null);
  const isVisible = useIntersectionObserver(observerRef, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  // Callback ref to set both refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    observerRef.current = node;
  }, []);

  const debouncedData = useDebounce(data, throttleUpdates ? 500 : 0);

  const processedData = useMemo(() => {
    if (!debouncedData || debouncedData.length === 0) return [];
    
    if (debouncedData.length > 500) {
      const step = Math.ceil(debouncedData.length / 500);
      return debouncedData.filter((_, index) => index % step === 0);
    }
    
    return debouncedData;
  }, [debouncedData]);

  if (lazyLoad && !isVisible) {
    return (
      <div 
        ref={setRefs} 
        className={className}
        style={{ height, backgroundColor: 'var(--terminal-bg-dark)' }}
      >
        <div className="flex items-center justify-center h-full text-[color:var(--terminal-text-secondary)]">
          Loading chart...
        </div>
      </div>
    );
  }

  // Use area chart if any series is area type
  const hasArea = series.some(s => s.type === 'area');
  const ChartComponent = hasArea ? AreaChart : LineChart;

  return (
    <div ref={setRefs} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent
          data={processedData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--terminal-border)" 
              opacity={0.3} 
            />
          )}
          <XAxis 
            dataKey="timestamp" 
            stroke="var(--terminal-text-secondary)"
            tick={{ fontSize: 11 }}
          />
          <YAxis 
            stroke="var(--terminal-text-secondary)"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatValue(value)}
          />
          <Tooltip 
            content={
              <CustomTooltip formatValue={formatValue} />
            }
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
            />
          )}
          {series.map((s) => {
            if (s.type === 'area' || hasArea) {
              return (
                <Area
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name}
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  dot={false}
                />
              );
            }
            return (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            );
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

export const MultiSeriesChart = withPerformanceMonitoring(
  memo(MultiSeriesChartComponent),
  'MultiSeriesChart'
);