'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useKeyboardNavigation } from '@/contexts/KeyboardNavigationContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  className = '',
  autoFocus = false,
  suggestions = [],
  onSuggestionSelect,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const { setMode } = useKeyboardNavigation();

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(value.toLowerCase())
  );

  // Keyboard shortcuts for search
  const searchShortcuts = [
    {
      key: '/',
      description: 'Focus search',
      category: 'search' as const,
      handler: () => {
        inputRef.current?.focus();
      },
    },
    {
      key: 'Escape',
      description: 'Clear search',
      category: 'search' as const,
      context: 'global' as const,
      handler: () => {
        if (document.activeElement === inputRef.current) {
          if (value) {
            onChange('');
            setShowSuggestions(false);
            setSelectedSuggestion(-1);
          } else {
            inputRef.current?.blur();
          }
        }
      },
    },
  ];

  useKeyboardShortcuts({
    shortcuts: searchShortcuts,
    enabled: true,
  });

  // Handle input focus
  const handleFocus = () => {
    setMode('search');
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    setMode('normal');
    // Delay to allow click on suggestions
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === 'Enter' && onSubmit) {
        e.preventDefault();
        onSubmit(value);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          const suggestion = filteredSuggestions[selectedSuggestion];
          onChange(suggestion);
          onSuggestionSelect?.(suggestion);
          setShowSuggestions(false);
          setSelectedSuggestion(-1);
        } else if (onSubmit) {
          onSubmit(value);
        }
        break;
      case 'Tab':
        if (selectedSuggestion >= 0) {
          e.preventDefault();
          const suggestion = filteredSuggestions[selectedSuggestion];
          onChange(suggestion);
          onSuggestionSelect?.(suggestion);
          setShowSuggestions(false);
          setSelectedSuggestion(-1);
        }
        break;
    }
  };

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Add data attribute for global shortcut targeting
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute('data-search-input', 'true');
    }
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectedSuggestion(-1);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
          aria-label="Search"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={showSuggestions && filteredSuggestions.length > 0}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {value && (
          <button
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Clear search"
          >
            <svg
              className="h-5 w-5 text-gray-400 hover:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          id="search-suggestions"
          className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto"
          role="listbox"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              onClick={() => {
                onChange(suggestion);
                onSuggestionSelect?.(suggestion);
                setShowSuggestions(false);
                setSelectedSuggestion(-1);
              }}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 ${
                index === selectedSuggestion ? 'bg-blue-50' : ''
              }`}
              role="option"
              aria-selected={index === selectedSuggestion}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Search hints */}
      <div className="mt-1 text-xs text-gray-500">
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">/</kbd> to focus •
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded ml-1">↑↓</kbd> to navigate •
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded ml-1">↵</kbd> to search
      </div>
    </div>
  );
};