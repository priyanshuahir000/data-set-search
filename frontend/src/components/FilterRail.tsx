import { useState } from 'react';
import type { FacetValue, Filters as FiltersState, SearchFacets } from '../types';
import {
  brandColors,
  categoryIcon,
  categoryInk,
  materialSwatch,
  monogram,
  typeIcon,
} from '../taxonomy';
import { Sym } from './Sym';

type FacetKind = 'category' | 'type' | 'material' | 'brand';

interface FilterRailProps {
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

const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: 'Under $150', max: 150 },
  { label: '$150 – $500', min: 150, max: 500 },
  { label: '$500 – $1,000', min: 500, max: 1000 },
  { label: 'Over $1,000', min: 1000 },
];

const RATING_OPTIONS = [
  { label: '4.5★', value: 4.5 },
  { label: '4.0★', value: 4 },
  { label: '3.0★', value: 3 },
];

function FacetChip({
  value,
  kind,
  active,
  onToggle,
}: {
  value: FacetValue;
  kind: FacetKind;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button className={`facet-chip${active ? ' is-active' : ''}`} onClick={onToggle}>
      {kind === 'category' && (
        <Sym name={categoryIcon(value.value)} size={17} fill={1} color={categoryInk(value.value)} />
      )}
      {kind === 'type' && <Sym name={typeIcon(value.value)} size={17} fill={1} color="#0A7A32" />}
      {kind === 'material' && (
        <span className="facet-swatch" style={{ background: materialSwatch(value.value) }} />
      )}
      {kind === 'brand' && (
        <span
          className="facet-mono"
          style={{ background: brandColors(value.value)[0], color: brandColors(value.value)[1] }}
        >
          {monogram(value.value)}
        </span>
      )}
      <span className="facet-chip-label">{value.value}</span>
      <span className="facet-chip-count">{value.count.toLocaleString()}</span>
    </button>
  );
}

function FacetGroup({
  title,
  values,
  kind,
  selected,
  onToggle,
}: {
  title: string;
  values: FacetValue[];
  kind: FacetKind;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (values.length === 0) return null;

  const visible = expanded ? values : values.slice(0, 8);
  const selectedSet = new Set(selected);

  return (
    <div className="filter-group">
      <div className="filter-group-title">{title}</div>
      <div className="facet-chips">
        {visible.map((v) => (
          <FacetChip
            key={v.value}
            value={v}
            kind={kind}
            active={selectedSet.has(v.value)}
            onToggle={() => onToggle(v.value)}
          />
        ))}
      </div>
      {values.length > 8 && (
        <button className="show-more" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show less' : `+ ${values.length - 8} more`}
        </button>
      )}
    </div>
  );
}

export function FilterRail({
  facets,
  filters,
  onToggle,
  onPrice,
  onRating,
  onInStock,
  onClear,
  hasActiveFilters,
  showHead = true,
}: FilterRailProps) {
  const activePreset = (p: (typeof PRICE_PRESETS)[number]) =>
    filters.minPrice === p.min && filters.maxPrice === p.max;

  return (
    <div className="filters">
      {showHead && (
        <div className="filters-head">
          <span className="filters-head-title">
            <Sym name="tune" size={20} color="#0A7A32" />
            Filters
          </span>
          {hasActiveFilters && (
            <button className="link-button" onClick={onClear}>
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="filter-group filter-group-stock">
        <button
          className={`facet-chip facet-chip-lg${filters.inStockOnly ? ' is-active' : ''}`}
          onClick={() => onInStock(!filters.inStockOnly)}
        >
          <Sym name={filters.inStockOnly ? 'check_circle' : 'add_circle'} size={18} fill={1} />
          In stock only
        </button>
      </div>

      <FacetGroup
        title="Category"
        values={facets.categories}
        kind="category"
        selected={filters.categories}
        onToggle={(v) => onToggle('categories', v)}
      />
      <FacetGroup
        title="Product type"
        values={facets.productTypes}
        kind="type"
        selected={filters.productTypes}
        onToggle={(v) => onToggle('productTypes', v)}
      />
      <FacetGroup
        title="Material"
        values={facets.materials}
        kind="material"
        selected={filters.materials}
        onToggle={(v) => onToggle('materials', v)}
      />
      <FacetGroup
        title="Brand"
        values={facets.brands}
        kind="brand"
        selected={filters.brands}
        onToggle={(v) => onToggle('brands', v)}
      />

      <div className="filter-group">
        <div className="filter-group-title">Price</div>
        <div className="pill-chips">
          {PRICE_PRESETS.map((p) => (
            <button
              key={p.label}
              className={`pill-chip${activePreset(p) ? ' is-active' : ''}`}
              onClick={() => (activePreset(p) ? onPrice(undefined, undefined) : onPrice(p.min, p.max))}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group filter-group-last">
        <div className="filter-group-title">Rating</div>
        <div className="pill-chips">
          {RATING_OPTIONS.map((r) => (
            <button
              key={r.value}
              className={`pill-chip${filters.minRating === r.value ? ' is-active' : ''}`}
              onClick={() => onRating(filters.minRating === r.value ? undefined : r.value)}
            >
              {r.label} &amp; up
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
