"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/actions/auth";
import { FormField } from "@/components/form-field";
import { Panel } from "@/components/panel";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <Panel>
      <form action={action} className="space-y-5" noValidate>
        <FormField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state?.email}
          errors={state?.fieldErrors?.email}
          required
        />
        <FormField
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          errors={state?.fieldErrors?.password}
          required
        />
        {state?.error && (
          <p role="alert" className="text-sm text-blood">
            {state.error}
          </p>
        )}
        <button type="submit" className="btn-ember" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-fog">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="text-ember-bright hover:underline">
          Crear cuenta
        </Link>
      </p>
    </Panel>
  );
}
