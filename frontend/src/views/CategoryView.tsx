import type { FacetValue, Product } from '../types';
import { plural, typeIcon, typeLabel, categoryInk, categoryTint } from '../taxonomy';
import { ProductCard } from '../components/ProductCard';
import { GridSkeleton } from '../components/Skeletons';
import { EndOfList } from '../components/EndOfList';
import { Sym } from '../components/Sym';

interface CategoryViewProps {
  catName: string;
  activeSub: string;
  subs: FacetValue[]; // subcategories (productTypes) with live counts
  items: Product[];
  loading: boolean;
  isPhone: boolean;
  onHome: () => void;
  onSelectSub: (sub: string) => void;
}

export function CategoryView({
  catName,
  activeSub,
  subs,
  items,
  loading,
  isPhone,
  onHome,
  onSelectSub,
}: CategoryViewProps) {
  const tint = categoryTint(catName);
  const ink = categoryInk(catName);
  const heading = `Buy ${plural(typeLabel(activeSub))} Online`;

  return (
    <main className="view view-category">
      <div className="breadcrumb">
        <button className="breadcrumb-link" onClick={onHome}>
          Home
        </button>
        <Sym name="chevron_right" size={16} />
        <span className="breadcrumb-cat">{catName}</span>
        <Sym name="chevron_right" size={16} />
        <span className="breadcrumb-sub">{typeLabel(activeSub)}</span>
      </div>

      <div className="two-pane">
        {!isPhone && (
          <aside className="sub-rail">
            {subs.map((s) => {
              const active = s.value === activeSub;
              return (
                <button
                  key={s.value}
                  className={`sub-row${active ? ' is-active' : ''}`}
                  onClick={() => onSelectSub(s.value)}
                >
                  <span className="sub-swatch" style={{ background: tint }}>
                    <Sym name={typeIcon(s.value)} size={24} fill={1} color={ink} />
                  </span>
                  <span className="sub-name">{typeLabel(s.value)}</span>
                  <span className="sub-count">{s.count.toLocaleString()}</span>
                </button>
              );
            })}
          </aside>
        )}

        <section className="two-pane-content">
          {isPhone && (
            <div className="sub-pills hs">
              {subs.map((s) => {
                const active = s.value === activeSub;
                return (
                  <button
                    key={s.value}
                    className={`sub-pill${active ? ' is-active' : ''}`}
                    onClick={() => onSelectSub(s.value)}
                  >
                    <Sym name={typeIcon(s.value)} size={18} fill={1} color={ink} />
                    {typeLabel(s.value)}
                  </button>
                );
              })}
            </div>
          )}

          <h1 className="page-heading">{heading}</h1>

          {loading ? (
            <GridSkeleton count={10} />
          ) : (
            <>
              <div className="grid">
                {items.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
              {items.length > 0 && <EndOfList />}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
