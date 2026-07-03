interface HighlightProps {
  text: string;
  tokens: string[];
}

// Highlight whole words that start with any query token. Tokens are prefixes
// (the backend searches "oak*"), so prefix matching here mirrors what actually
// matched on the server.
export function Highlight({ text, tokens }: HighlightProps) {
  if (!tokens.length) return <>{text}</>;

  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        const lower = part.toLowerCase();
        const isMatch = tokens.some((t) => t.length > 0 && lower.startsWith(t));
        return isMatch ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>;
      })}
    </>
  );
}
