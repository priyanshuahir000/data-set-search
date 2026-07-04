import { useEffect, useRef, useState } from 'react';
import type { Suggestion } from '../types';
import { compact, TRENDING } from '../taxonomy';
import { Sym } from './Sym';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  suggestions: Suggestion[];
}

const KIND_LABEL: Record<Suggestion['kind'], string> = {
  product: '',
  productType: 'Type',
  brand: 'Brand',
  material: 'Material',
  category: 'Category',
};

export function SearchBar({ value, onChange, onSubmit, suggestions }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => setActive(-1), [suggestions]);

  const run = (q: string) => {
    onSubmit(q);
    setOpen(false);
  };

  const choose = (s: Suggestion) => {
    onChange(s.label);
    run(s.label);
  };

  const clear = () => {
    onChange('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && suggestions[active]) choose(suggestions[active]!);
      else run(value);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showSuggest = open && focused && value.trim().length > 0 && suggestions.length > 0;
  const showTrending = open && focused && value.trim().length === 0;

  return (
    <div className="searchbar" ref={wrapRef}>
      <span className="searchbar-icon">
        <Sym name="search" size={21} color="#0A7A32" />
      </span>
      <input
        className="searchbar-input"
        type="text"
        name="q"
        placeholder={'Search “oak shelf”, “vase under 300”, “marble”…'}
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        aria-label="Search products"
      />

      {value && (
        <button className="searchbar-clear" onClick={clear} aria-label="Clear search" type="button">
          <Sym name="close" size={16} />
        </button>
      )}
      <button className="searchbar-submit" onClick={() => run(value)} aria-label="Search" type="button">
        <Sym name="arrow_forward" size={20} color="#fff" />
      </button>

      {showSuggest && (
        <ul className="suggestions" role="listbox" data-lenis-prevent>
          {suggestions.map((s, i) => (
            <li
              key={`${s.kind}:${s.label}`}
              role="option"
              aria-selected={i === active}
              className={`suggestion${i === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
            >
              <span className="suggestion-icon">
                <Sym name="search" size={18} color="#9AA39B" />
              </span>
              <span className="suggestion-label">{s.label}</span>
              {s.kind !== 'product' && <span className="suggestion-kind">{KIND_LABEL[s.kind]}</span>}
              {s.count != null && <span className="suggestion-count">{compact(s.count)} items</span>}
            </li>
          ))}
        </ul>
      )}

      {showTrending && (
        <div className="trending" data-lenis-prevent>
          <div className="trending-label">Trending searches</div>
          <div className="trending-chips">
            {TRENDING.map((t) => (
              <button
                key={t}
                className="trending-chip"
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(t);
                  run(t);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
