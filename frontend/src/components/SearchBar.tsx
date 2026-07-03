import { useEffect, useRef, useState } from 'react';
import type { Suggestion } from '../types';
import { IconArrowRight, IconClose, IconSearch } from './Icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  suggestions: Suggestion[];
}

const kindLabel: Record<Suggestion['kind'], string> = {
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

  useEffect(() => {
    setActive(-1);
  }, [suggestions]);

  const choose = (s: Suggestion) => {
    onChange(s.label);
    onSubmit(s.label);
    setOpen(false);
  };

  const submit = () => {
    onSubmit(value);
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    onSubmit('');
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
      if (open && active >= 0 && suggestions[active]) {
        choose(suggestions[active]!);
      } else {
        submit();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showSuggestions = open && focused && suggestions.length > 0;

  return (
    <div className={`searchbar ${focused ? 'is-focused' : ''}`} ref={wrapRef}>
      <span className="searchbar-icon" aria-hidden="true">
        <IconSearch size={20} />
      </span>
      <input
        className="searchbar-input"
        type="text"
        placeholder="Search for a lamp, oak shelf, vintage rug..."
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
          <IconClose size={15} />
        </button>
      )}
      <button className="searchbar-submit" onClick={submit} aria-label="Search" type="button">
        <IconArrowRight size={18} />
      </button>

      {showSuggestions && (
        <ul className="suggestions" role="listbox" data-lenis-prevent>
          {suggestions.map((s, i) => (
            <li
              key={`${s.kind}:${s.label}`}
              role="option"
              aria-selected={i === active}
              className={`suggestion ${i === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
            >
              <span className="suggestion-icon" aria-hidden="true">
                <IconSearch size={15} />
              </span>
              <span className="suggestion-label">{s.label}</span>
              {s.kind !== 'product' && <span className="suggestion-kind">{kindLabel[s.kind]}</span>}
              {s.count != null && <span className="suggestion-count">{s.count.toLocaleString()}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
