export function ActivityPage() {
  return (
    <div className="border-border bg-surface rounded-[32px] border px-6 py-10 shadow-[0_24px_60px_-42px_rgba(32,33,36,0.32)]">
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">
        Activity
      </p>
      <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight">
        Activity route placeholder
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
        The shell is now routed. Student Overview remains the active
        implementation target, while the secondary workspace route stays
        intentionally minimal.
      </p>
    </div>
  );
}
