// Shimmer placeholders shown on every view change / new search (~620ms).

function CardSkeleton() {
  return (
    <div className="skel-card">
      <div className="skel-block skel-media" />
      <div className="skel-line w60" />
      <div className="skel-line w100" />
      <div className="skel-line w45" />
    </div>
  );
}

export function RailSkeleton() {
  return (
    <div className="rail-skel">
      <div className="skel-line skel-railtitle" />
      <div className="rail-skel-track">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rail-skel-item">
            <CardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeRailsSkeleton() {
  return (
    <>
      <RailSkeleton />
      <RailSkeleton />
    </>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
