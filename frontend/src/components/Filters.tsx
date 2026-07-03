import { useEffect, useState } from 'react';
import type { FacetValue, Filters as FiltersState, SearchFacets } from '../types';
import { IconChevronDown, IconSliders } from './Icons';

interface FiltersProps {
  facets: SearchFacets;
  filters: FiltersState;
  onToggle: (dimension: keyof FiltersState, value: string) => void;
  onPrice: (min: number | undefined, max: number | undefined) => void;
  onRating: (min: number | undefined) => void;
  onInStock: (on: boolean) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  showHead?: boolean;
}

function FacetGroup({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (values.length === 0) return null;

  const visible = expanded ? values : values.slice(0, 8);
  const selectedSet = new Set(selected);

  return (
    <div className="filter-group">
      <div className="filter-group-title">{title}</div>
      <ul className="facet-list">
        {visible.map((v) => (
          <li key={v.value}>
            <label className="facet-item">
              <input
                type="checkbox"
                checked={selectedSet.has(v.value)}
                onChange={() => onToggle(v.value)}
              />
              <span className="facet-name">{v.value}</span>
              <span className="facet-count">{v.count.toLocaleString()}</span>
            </label>
          </li>
        ))}
      </ul>
      {values.length > 8 && (
        <button className="show-more" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show less' : `Show all ${values.length}`}
          <IconChevronDown size={14} className={`show-more-caret ${expanded ? 'up' : ''}`} />
        </button>
      )}
    </div>
  );
}

const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: 'Under $150', max: 150 },
  { label: '$150 to $500', min: 150, max: 500 },
  { label: '$500 to $1,000', min: 500, max: 1000 },
  { label: 'Over $1,000', min: 1000 },
];

const RATING_OPTIONS = [
  { label: '4.5 and up', value: 4.5 },
  { label: '4.0 and up', value: 4 },
  { label: '3.0 and up', value: 3 },
];

export function Filters({
  facets,
  filters,
  onToggle,
  onPrice,
  onRating,
  onInStock,
  onClear,
  hasActiveFilters,
  showHead = true,
}: FiltersProps) {
  const [minInput, setMinInput] = useState(filters.minPrice?.toString() ?? '');
  const [maxInput, setMaxInput] = useState(filters.maxPrice?.toString() ?? '');

  useEffect(() => {
    setMinInput(filters.minPrice?.toString() ?? '');
    setMaxInput(filters.maxPrice?.toString() ?? '');
  }, [filters.minPrice, filters.maxPrice]);

  const commitPrice = () => {
    const min = minInput === '' ? undefined : Number(minInput);
    const max = maxInput === '' ? undefined : Number(maxInput);
    onPrice(Number.isFinite(min as number) ? min : undefined, Number.isFinite(max as number) ? max : undefined);
  };

  const activePreset = (p: (typeof PRICE_PRESETS)[number]) =>
    filters.minPrice === p.min && filters.maxPrice === p.max;

  return (
    <div className="filters">
      {showHead && (
        <div className="filters-head">
          <span className="filters-head-title">
            <IconSliders size={16} />
            Filters
          </span>
          {hasActiveFilters && (
            <button className="link-button" onClick={onClear}>
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="filter-group">
        <label className="facet-item toggle">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => onInStock(e.target.checked)}
          />
          <span className="facet-name">In stock only</span>
        </label>
      </div>

      <FacetGroup
        title="Category"
        values={facets.categories}
        selected={filters.categories}
        onToggle={(v) => onToggle('categories', v)}
      />

      <FacetGroup
        title="Product type"
        values={facets.productTypes}
        selected={filters.productTypes}
        onToggle={(v) => onToggle('productTypes', v)}
      />

      <FacetGroup
        title="Material"
        values={facets.materials}
        selected={filters.materials}
        onToggle={(v) => onToggle('materials', v)}
      />

      <div className="filter-group">
        <div className="filter-group-title">Price</div>
        <div className="price-presets">
          {PRICE_PRESETS.map((p) => (
            <button
              key={p.label}
              className={`chip ${activePreset(p) ? 'chip-active' : ''}`}
              onClick={() =>
                activePreset(p) ? onPrice(undefined, undefined) : onPrice(p.min, p.max)
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="price-inputs">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => e.key === 'Enter' && commitPrice()}
          />
          <span>to</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => e.key === 'Enter' && commitPrice()}
          />
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-group-title">Rating</div>
        <div className="rating-options">
          {RATING_OPTIONS.map((r) => (
            <button
              key={r.value}
              className={`chip ${filters.minRating === r.value ? 'chip-active' : ''}`}
              onClick={() => onRating(filters.minRating === r.value ? undefined : r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <FacetGroup
        title="Brand"
        values={facets.brands}
        selected={filters.brands}
        onToggle={(v) => onToggle('brands', v)}
      />
    </div>
  );
}
