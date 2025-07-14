'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPreferences } from '@/types/models';

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  defaultView: 'list',
  refreshInterval: 30,
  showNotifications: true,
  compactMode: false,
  defaultTimeRange: '1M',
  favoriteMetrics: ['premiumToNav', 'treasuryValue', 'marketCap']
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('dat_preferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (error) {
        console.error('Failed to parse stored preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dat_preferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    localStorage.removeItem('dat_preferences');
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences, resetPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}