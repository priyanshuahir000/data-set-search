import { Sym } from './Sym';

interface PromoBannersProps {
  onShopNew: () => void;
  onEditor: () => void;
}

// Two promo banners. The right banner's 132×132 "Product PNG" slot in the
// prototype was a placeholder web component; here we stand it in with a
// category-tinted panel + glyph until real art is supplied.
export function PromoBanners({ onShopNew, onEditor }: PromoBannersProps) {
  return (
    <div className="promos">
      <div className="promo promo-new">
        <span className="promo-eyebrow">NEW SEASON</span>
        <h2 className="promo-headline">Refresh every nook</h2>
        <p className="promo-copy">Up to 40% off lighting, textiles &amp; decor for the season.</p>
        <button className="promo-btn" onClick={onShopNew}>
          Shop new in
        </button>
        <Sym name="potted_plant" size={150} className="promo-bleed" />
      </div>

      <div className="promo promo-editor">
        <div className="promo-editor-text">
          <span className="promo-eyebrow promo-eyebrow-amber">EDITOR&rsquo;S PICKS</span>
          <h2 className="promo-headline promo-headline-amber">The Lighting Edit</h2>
          <p className="promo-copy promo-copy-amber">Sculptural lamps &amp; lanterns.</p>
          <button className="promo-btn promo-btn-amber" onClick={onEditor}>
            Explore
          </button>
        </div>
        <div className="promo-shot" aria-hidden="true">
          <Sym name="lightbulb" size={64} fill={1} color="#B77914" />
        </div>
      </div>
    </div>
  );
}
