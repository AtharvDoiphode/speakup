// A stand-in for pages that aren't built yet, so every sidebar link goes somewhere.
export default function ComingSoon({ title }) {
  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
      <div className="mt-6 rounded-panel border border-border-subtle bg-surface-card p-8">
        <p className="font-semibold text-text-primary">Coming soon</p>
        <p className="mt-1 text-sm text-text-secondary">
          This page isn&apos;t built yet. It will appear here in a later step.
        </p>
      </div>
    </div>
  );
}
