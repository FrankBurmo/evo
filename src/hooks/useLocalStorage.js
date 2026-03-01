import { useState, useCallback } from 'react';

/**
 * useLocalStorage — synkroniserer React-state med localStorage.
 *
 * @param {string} key - localStorage-nøkkel
 * @param {*} initialValue - standardverdi hvis nøkkelen ikke finnes
 * @returns {[value, setValue, removeValue]}
 */
export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    setStoredValue(prev => {
      const valueToStore = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {
        // Ignorer skrivefeil (f.eks. localStorage fullt)
      }
      return valueToStore;
    });
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignorer
    }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
