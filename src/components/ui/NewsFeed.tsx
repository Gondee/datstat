'use client';

import React, { useState, useMemo } from 'react';
import { NewsItem, NewsFilter } from '@/types/models';
import { cn } from '@/utils/cn';
import { TerminalCard } from './TerminalCard';

interface NewsFeedProps {
  news: NewsItem[];
  filter?: NewsFilter;
  showFullContent?: boolean;
  maxItems?: number;
  className?: string;
}

export const NewsFeed: React.FC<NewsFeedProps> = React.memo(({ 
  news, 
  filter, 
  showFullContent = false,
  maxItems,
  className 
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredNews = useMemo(() => {
    let filtered = [...news];

    if (filter) {
      if (filter.categories?.length) {
        filtered = filtered.filter(item => 
          filter.categories!.includes(item.category)
        );
      }

      if (filter.tickers?.length) {
        filtered = filtered.filter(item => 
          item.relatedTickers?.some(ticker => 
            filter.tickers!.includes(ticker)
          )
        );
      }

      if (filter.cryptos?.length) {
        filtered = filtered.filter(item => 
          item.relatedCryptos?.some(crypto => 
            filter.cryptos!.includes(crypto)
          )
        );
      }

      if (filter.sentiment) {
        filtered = filtered.filter(item => 
          item.sentiment === filter.sentiment
        );
      }

      if (filter.dateFrom) {
        filtered = filtered.filter(item => 
          new Date(item.publishedAt) >= filter.dateFrom!
        );
      }

      if (filter.dateTo) {
        filtered = filtered.filter(item => 
          new Date(item.publishedAt) <= filter.dateTo!
        );
      }
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    if (maxItems) {
      filtered = filtered.slice(0, maxItems);
    }

    return filtered;
  }, [news, filter, maxItems]);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMins > 0) {
      return `${diffMins}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-400';
      case 'negative':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      crypto: 'bg-blue-500/20 text-blue-400',
      company: 'bg-purple-500/20 text-purple-400',
      market: 'bg-green-500/20 text-green-400',
      regulation: 'bg-red-500/20 text-red-400',
      technology: 'bg-yellow-500/20 text-yellow-400'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';
  };

  if (filteredNews.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-green-400/60 font-mono">No news items found</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {filteredNews.map((item) => {
        const isExpanded = expandedItems.has(item.id) || showFullContent;

        return (
          <TerminalCard key={item.id} className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-green-400 font-bold text-lg leading-tight">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-green-400/60 text-xs font-mono">
                      {item.source}
                    </span>
                    <span className="text-green-400/40 text-xs">
                      •
                    </span>
                    <span className="text-green-400/60 text-xs font-mono">
                      {formatTimeAgo(item.publishedAt)}
                    </span>
                    {item.sentiment && (
                      <>
                        <span className="text-green-400/40 text-xs">
                          •
                        </span>
                        <span className={cn(
                          "text-xs font-mono uppercase",
                          getSentimentColor(item.sentiment)
                        )}>
                          {item.sentiment}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className={cn(
                  "text-xs font-mono px-2 py-1 rounded uppercase",
                  getCategoryBadge(item.category)
                )}>
                  {item.category}
                </span>
              </div>

              {/* Content */}
              <div className="text-green-400/80 text-sm leading-relaxed">
                {isExpanded ? (
                  <div className="space-y-2">
                    <p>{item.summary}</p>
                    {item.content && (
                      <p className="text-green-400/60">{item.content}</p>
                    )}
                  </div>
                ) : (
                  <p>{item.summary}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-green-500/20">
                <div className="flex items-center gap-4">
                  {/* Tags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-xs font-mono text-green-400/60 px-2 py-0.5 border border-green-500/30 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-xs text-green-400/40">
                        +{item.tags.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Related Assets */}
                  <div className="flex items-center gap-2">
                    {item.relatedTickers?.map(ticker => (
                      <span
                        key={ticker}
                        className="text-xs font-mono font-bold text-green-400 px-2 py-0.5 bg-green-500/10 rounded"
                      >
                        ${ticker}
                      </span>
                    ))}
                    {item.relatedCryptos?.map(crypto => (
                      <span
                        key={crypto}
                        className="text-xs font-mono font-bold text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded"
                      >
                        {crypto}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {item.content && !showFullContent && (
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="text-xs font-mono text-green-400 hover:text-green-300 transition-colors"
                    >
                      {isExpanded ? 'COLLAPSE' : 'EXPAND'}
                    </button>
                  )}
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-green-400 hover:text-green-300 transition-colors"
                    >
                      SOURCE →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </TerminalCard>
        );
      })}
    </div>
  );
});

NewsFeed.displayName = 'NewsFeed';