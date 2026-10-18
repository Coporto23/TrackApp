"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ComponentType, type SVGProps } from "react";
import { BonfireIcon, CalendarIcon, ChartIcon, HelmIcon } from "./icons";

type NavItem = {
  href: "/" | "/calendario" | "/dashboard" | "/perfil";
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", Icon: BonfireIcon },
  { href: "/calendario", label: "Calendario", Icon: CalendarIcon },
  { href: "/dashboard", label: "Dashboard", Icon: ChartIcon },
  { href: "/perfil", label: "Perfil", Icon: HelmIcon },
];

// Ejercicios y Rutinas se abren desde Inicio, así que cuentan como esa pestaña.
const HOME_SECTIONS = ["/ejercicios", "/rutinas"];

// usePathname() es dato de runtime en rutas dinámicas (/rutinas/[id]): con Cache
// Components debe ir dentro de <Suspense>. El fallback es la barra sin pestaña activa.
export function BottomNav() {
  return (
    <Suspense fallback={<NavBar pathname={null} />}>
      <CurrentNavBar />
    </Suspense>
  );
}

function CurrentNavBar() {
  return <NavBar pathname={usePathname()} />;
}

function NavBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-edge bg-abyss/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active =
            pathname !== null &&
            (href === "/"
              ? pathname === "/" || HOME_SECTIONS.some((s) => pathname.startsWith(s))
              : pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-3 transition-colors ${
                  active ? "text-ember-bright" : "text-fog hover:text-bone"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 h-1.5 w-1.5 -translate-y-1/2 rotate-45 bg-ember shadow-[0_0_10px_2px_rgba(217,120,43,0.6)]"
                  />
                )}
                <Icon
                  className={`h-6 w-6 ${active ? "drop-shadow-[0_0_6px_rgba(242,165,90,0.55)]" : ""}`}
                />
                <span className="font-display text-[10px] tracking-[0.14em] uppercase">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
