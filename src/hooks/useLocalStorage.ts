import { useState, useCallback } from 'react';

/**
 * useLocalStorage — synkroniserer React-state med localStorage.
 *
 * @param key - localStorage-nøkkel
 * @param initialValue - standardverdi hvis nøkkelen ikke finnes
 * @returns [storedValue, setValue, removeValue]
 */
export default function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore =
          typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch {
          // Ignorer skrivefeil (f.eks. localStorage fullt)
        }
        return valueToStore;
      });
    },
    [key],
  );

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
