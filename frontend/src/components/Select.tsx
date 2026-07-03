import { useEffect, useRef, useState } from 'react';
import { IconChevronDown } from './Icons';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}

// A small custom dropdown so the menu matches the rest of the UI. Native <select>
// popups cannot be styled, which is why the default one looked out of place.
export function Select({ value, options, onChange, ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open) setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open && options[active]) choose(options[active]!.value);
      else setOpen(true);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`select ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span>{current?.label}</span>
        <IconChevronDown size={16} className={`select-button-caret ${open ? 'up' : ''}`} />
      </button>

      {open && (
        <ul className="select-menu" role="listbox" data-lenis-prevent>
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`select-option ${i === active ? 'active' : ''} ${
                o.value === value ? 'selected' : ''
              }`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o.value);
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
