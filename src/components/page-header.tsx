export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-2xl font-bold tracking-[0.12em] text-gold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-fog">{subtitle}</p>}
      <div aria-hidden className="mt-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rotate-45 bg-ember" />
        <span className="h-px flex-1 bg-gradient-to-r from-stone-edge to-transparent" />
      </div>
    </header>
  );
}
