import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { logout } from "@/actions/auth";
import { ChevronRightIcon, GearIcon, HelmIcon, ScrollIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Más opciones" };

type OptionItem = {
  href: "/opciones/perfil" | "/opciones/ajustes" | "/opciones/tutorial";
  label: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const OPTIONS: OptionItem[] = [
  { href: "/opciones/perfil", label: "Mi Perfil", description: "Tu cuenta y tus datos.", Icon: HelmIcon },
  { href: "/opciones/ajustes", label: "Ajustes", description: "Preferencias de la aplicación.", Icon: GearIcon },
  { href: "/opciones/tutorial", label: "Documentación", description: "Cómo sacarle partido a TrackApp.", Icon: ScrollIcon },
];

// Menú central de la pestaña "Más": acceso al perfil y a futuras configuraciones.
export default function OptionsPage() {
  return (
    <>
      <PageHeader title="Más opciones" />
      <nav aria-label="Más opciones">
        <ul className="space-y-3">
          {OPTIONS.map(({ href, label, description, Icon }) => (
            <li key={href}>
              <Link href={href} className="group block">
                <div className="facet bg-stone-edge p-px transition-colors group-hover:bg-ember-deep">
                  <div className="facet flex items-center gap-4 bg-stone/95 px-4 py-4">
                    <Icon className="h-7 w-7 shrink-0 text-ember" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-sm font-bold tracking-[0.12em] text-bone uppercase">
                        {label}
                      </span>
                      <span className="block text-sm text-fog">{description}</span>
                    </span>
                    <ChevronRightIcon className="h-5 w-5 shrink-0 text-fog group-hover:text-ember-bright" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <form action={logout} className="mt-10">
        <button type="submit" className="btn-ghost">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
