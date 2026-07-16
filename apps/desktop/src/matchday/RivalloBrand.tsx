export function RivalloBrand({ compact = false }: { readonly compact?: boolean }) {
  return (
    <span aria-label="Rivallo" className="rivallo-brand" data-compact={compact || undefined}>
      <svg aria-hidden="true" className="rivallo-brand__mark" viewBox="0 0 48 52">
        <path
          className="rivallo-brand__frame"
          d="M24 2 42 9v15c0 13-7.5 21-18 26C13.5 45 6 37 6 24V9Z"
        />
        <path
          className="rivallo-brand__field"
          d="M13 14h18.5c4.7 0 7.5 2.7 7.5 6.7 0 3.6-2.2 6-5.8 6.8L40 39h-8l-6.3-10.8H20V39h-7Zm7 5.5v3.8h10.6c1 0 1.6-.7 1.6-1.9s-.6-1.9-1.6-1.9Z"
        />
        <path className="rivallo-brand__spark" d="m15 7 3.2 2.3L24 5l5.8 4.3L33 7" />
      </svg>
      {!compact && (
        <span className="rivallo-brand__wordmark">
          <strong>Rivallo</strong>
          <small>Football command</small>
        </span>
      )}
    </span>
  );
}
