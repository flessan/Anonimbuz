import React, { createContext, useContext, useState, useEffect } from 'react';

const FeatureFlagContext = createContext({});

const defaultFlags = {
  enablePrompts: true,
  enableNotes: false,
  enableThreads: false,
};

export function FeatureFlagProvider({ children }) {
  const [flags, setFlags] = useState(defaultFlags);

  // In a real application, you might fetch flags from the API or a service like LaunchDarkly.
  // For now, we sync them from localStorage for easy testing/rollback.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('anomia_flags');
      if (stored) {
        setFlags({ ...defaultFlags, ...JSON.parse(stored) });
      } else {
        localStorage.setItem('anomia_flags', JSON.stringify(defaultFlags));
      }
    } catch (e) {
      console.error('Failed to load feature flags', e);
    }
  }, []);

  const toggleFlag = (flagName) => {
    setFlags(prev => {
      const newFlags = { ...prev, [flagName]: !prev[flagName] };
      localStorage.setItem('anomia_flags', JSON.stringify(newFlags));
      return newFlags;
    });
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, toggleFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}
