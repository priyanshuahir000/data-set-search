import { IconStar } from './Icons';

interface RatingStarsProps {
  rating: number;
  reviews?: number;
  size?: number;
}

// Two identical rows of SVG stars stacked on top of each other. The gold row is
// clipped to the exact rating percentage, so 4.6 shows four and a bit stars with
// pixel accurate alignment.
export function RatingStars({ rating, reviews, size = 14 }: RatingStarsProps) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  const stars = (
    <>
      <IconStar size={size} />
      <IconStar size={size} />
      <IconStar size={size} />
      <IconStar size={size} />
      <IconStar size={size} />
    </>
  );

  return (
    <span className="rating" title={`${rating.toFixed(1)} out of 5`}>
      <span className="stars" aria-hidden="true">
        <span className="stars-track">{stars}</span>
        <span className="stars-fill" style={{ width: `${pct}%` }}>
          {stars}
        </span>
      </span>
      <span className="rating-value">{rating.toFixed(1)}</span>
      {reviews != null && <span className="rating-count">({reviews.toLocaleString()})</span>}
    </span>
  );
}
