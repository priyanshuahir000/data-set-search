import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Product } from './types';

// In-memory cart. The app is discovery-only on the backend, so the cart lives
// entirely client-side, per the redesign handoff. We keep a snapshot of each
// added product (not just a qty) so the subtotal is correct regardless of which
// view the item was added from.
interface CartLine {
  product: Product;
  qty: number;
}

interface CartContextValue {
  lines: Record<string, CartLine>;
  count: number;
  subtotal: number;
  add: (product: Product) => void;
  dec: (id: string) => void;
  qty: (id: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Record<string, CartLine>>({});

  const add = useCallback((product: Product) => {
    const id = String(product.id);
    setLines((c) => ({ ...c, [id]: { product, qty: (c[id]?.qty ?? 0) + 1 } }));
  }, []);

  const dec = useCallback((id: string) => {
    setLines((c) => {
      const next = (c[id]?.qty ?? 0) - 1;
      const copy = { ...c };
      if (next <= 0) delete copy[id];
      else copy[id] = { ...copy[id]!, qty: next };
      return copy;
    });
  }, []);

  const qty = useCallback((id: string) => lines[id]?.qty ?? 0, [lines]);

  const count = useMemo(
    () => Object.values(lines).reduce((a, l) => a + l.qty, 0),
    [lines],
  );
  const subtotal = useMemo(
    () => Object.values(lines).reduce((a, l) => a + l.product.price * l.qty, 0),
    [lines],
  );

  const value = useMemo<CartContextValue>(
    () => ({ lines, count, subtotal, add, dec, qty }),
    [lines, count, subtotal, add, dec, qty],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
