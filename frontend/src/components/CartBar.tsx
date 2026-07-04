import { money } from '../taxonomy';
import { Sym } from './Sym';

interface CartBarProps {
  count: number;
  subtotal: number;
  onViewCart: () => void;
}

// Sticky bottom bar, appears when the cart has items.
export function CartBar({ count, subtotal, onViewCart }: CartBarProps) {
  return (
    <div className="cartbar">
      <div className="cartbar-inner">
        <Sym name="shopping_bag" size={26} color="#fff" />
        <div className="cartbar-text">
          <div className="cartbar-count">
            {count} {count === 1 ? 'item' : 'items'} added
          </div>
          <div className="cartbar-sub">{money(subtotal)} · plus taxes</div>
        </div>
        <button className="cartbar-btn" onClick={onViewCart}>
          View cart
          <Sym name="arrow_forward" size={18} color="#0A7A32" />
        </button>
      </div>
    </div>
  );
}
