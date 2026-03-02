import { useEffect } from 'react';
import useLocalStorage from './useLocalStorage';

export type Theme = 'dark' | 'light';

/**
 * useTheme — håndterer dark/light-modus med persistering i localStorage.
 *
 * Setter `data-theme`-attributt på `<html>`-elementet slik at CSS-variabler
 * kan byttes automatisk. Standard er 'dark'.
 *
 * @returns [theme, toggleTheme]
 */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useLocalStorage<Theme>('evo-theme', 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return [theme, toggleTheme];
}
