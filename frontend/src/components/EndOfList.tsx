// Shown at the bottom of a fully-loaded product listing so the shopper knows
// there is nothing more to load. The illustration already carries the copy.
export function EndOfList() {
  return (
    <div className="end-of-list">
      <img
        src="/seen-it-all.png"
        style={{ width: "100%", maxWidth: "600px", height: "auto" }}
        alt="You've seen it all — no more items to show."
        loading="lazy"
      />
    </div>
  );
}
