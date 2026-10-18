import type { Metadata } from "next";
import { Suspense } from "react";
import { logout } from "@/actions/auth";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Perfil" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Perfil" />
      <div className="space-y-4">
        <Suspense fallback={<p className="text-fog">Leyendo el pergamino…</p>}>
          <AccountDetails />
        </Suspense>
        <form action={logout}>
          <button type="submit" className="btn-ghost">
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );
}

async function AccountDetails() {
  const user = await getCurrentUser();
  const memberSince = new Intl.DateTimeFormat("es-CL", { dateStyle: "long" }).format(user.createdAt);

  return (
    <Panel>
      <dl className="space-y-3">
        <div>
          <dt className="font-display text-xs tracking-[0.15em] text-fog uppercase">Email</dt>
          <dd className="mt-0.5 break-all text-bone">{user.email}</dd>
        </div>
        <div>
          <dt className="font-display text-xs tracking-[0.15em] text-fog uppercase">Miembro desde</dt>
          <dd className="mt-0.5 text-bone">{memberSince}</dd>
        </div>
      </dl>
    </Panel>
  );
}
