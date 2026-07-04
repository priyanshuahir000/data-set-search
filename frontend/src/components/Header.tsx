import type { Suggestion } from '../types';
import { CATEGORIES } from '../taxonomy';
import { SearchBar } from './SearchBar';
import { Sym } from './Sym';

interface HeaderProps {
  view: 'home' | 'category' | 'search';
  activeCategory: string;
  compact: boolean;
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit: (v: string) => void;
  suggestions: Suggestion[];
  cartCount: number;
  onHome: () => void;
  onOpenCategory: (name: string) => void;
}

export function Header({
  view,
  activeCategory,
  compact,
  query,
  onQueryChange,
  onSubmit,
  suggestions,
  cartCount,
  onHome,
  onOpenCategory,
}: HeaderProps) {
  const showBigStrip = view === 'home';
  const bigExpanded = view === 'home' && !compact;

  const bigStripStyle = bigExpanded
    ? {
        maxHeight: 122,
        opacity: 1,
        padding: '14px 0 10px',
        pointerEvents: 'auto' as const,
        transition:
          'max-height .38s cubic-bezier(.2,.7,.2,1),opacity .28s ease,padding .38s ease',
      }
    : {
        maxHeight: 0,
        opacity: 0,
        padding: 0,
        // Never intercept clicks once collapsing — the compact tabs sit under it.
        pointerEvents: 'none' as const,
        transition:
          'max-height .38s cubic-bezier(.2,.7,.2,1),opacity .18s ease,padding .38s ease',
      };

  const tabsStyle = bigExpanded
    ? {
        maxHeight: 0,
        opacity: 0,
        overflow: 'hidden' as const,
        transition: 'max-height .34s ease,opacity .16s ease',
      }
    : { maxHeight: 54, opacity: 1, transition: 'max-height .34s ease,opacity .3s ease' };

  return (
    <header className={`header${compact ? ' is-compact' : ''}`}>
      <div className="header-row">
        <button className="wordmark" onClick={onHome}>
          Maison
        </button>

        <SearchBar value={query} onChange={onQueryChange} onSubmit={onSubmit} suggestions={suggestions} />

        <div className="header-actions">
          <button className="btn-ghost" type="button">
            <Sym name="account_circle" size={23} color="#3A423B" />
            <span className="btn-ghost-label">Log in</span>
          </button>
          <button className="btn-cart" type="button">
            <Sym name="shopping_cart" size={21} color="#fff" />
            Cart
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      <div className="catzone">
        {showBigStrip && (
          <div className="bigstrip" style={bigStripStyle}>
            <div className="bigstrip-track hs">
              {CATEGORIES.map((c) => (
                <button key={c.name} className="bigtile" onClick={() => onOpenCategory(c.name)}>
                  <span className="bigtile-icon">
                    <Sym name={c.icon} size={35} fill={0} weight={500} color="#0A7A32" />
                  </span>
                  <span className="bigtile-name">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="tabs" style={tabsStyle}>
          <div className="tabs-track hs">
            <button
              className={`tab${view === 'home' ? ' is-active' : ''}`}
              onClick={onHome}
            >
              <Sym name="apps" size={19} />
              All
            </button>
            {CATEGORIES.map((c) => {
              const isActive = view === 'category' && activeCategory === c.name;
              return (
                <button
                  key={c.name}
                  className={`tab${isActive ? ' is-active' : ''}`}
                  onClick={() => onOpenCategory(c.name)}
                >
                  <Sym name={c.icon} size={19} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
