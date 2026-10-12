// A stand-in for pages that aren't built yet, so every sidebar link goes somewhere.
export default function ComingSoon({ title }) {
  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-bold text-ink">{title}</h1>
      <div className="mt-6 rounded-panel border border-line bg-surface p-8">
        <p className="font-semibold text-ink">Coming soon</p>
        <p className="mt-1 text-sm text-ink-soft">
          This page isn&apos;t built yet. It will appear here in a later step.
        </p>
      </div>
    </div>
  );
}
