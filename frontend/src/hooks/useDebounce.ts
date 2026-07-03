import { useEffect, useState } from 'react';

// Small debounce so we search as the user types without a request per keystroke.
export function useDebounce<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
