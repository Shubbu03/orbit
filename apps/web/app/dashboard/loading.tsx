export default function DashboardLoading() {
  return (
    <div className="grid min-h-[calc(100svh-4rem)] place-items-center lg:min-h-[calc(100svh-5rem)]">
      <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
        <span className="size-2 animate-pulse-soft rounded-full bg-primary" />
        Loading dashboard
      </div>
    </div>
  );
}
