import { CrestIcon } from "@/components/icons";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
      <header className="mb-8 flex flex-col items-center text-center">
        <CrestIcon className="mb-4 h-16 w-16 drop-shadow-[0_0_18px_rgba(217,120,43,0.35)]" />
        <h1 className="font-display text-3xl font-bold tracking-[0.2em] text-gold">TRACKAPP</h1>
        <p className="mt-2 text-sm text-fog">Forja tu progreso, serie a serie.</p>
      </header>
      {children}
    </main>
  );
}
