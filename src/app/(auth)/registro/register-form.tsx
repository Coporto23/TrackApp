"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/actions/auth";
import { FormField } from "@/components/form-field";
import { Panel } from "@/components/panel";

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);

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
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          errors={state?.fieldErrors?.password}
          required
        />
        <FormField
          name="confirmPassword"
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          errors={state?.fieldErrors?.confirmPassword}
          required
        />
        <button type="submit" className="btn-ember" disabled={pending}>
          {pending ? "Forjando cuenta…" : "Crear cuenta"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-fog">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-ember-bright hover:underline">
          Entrar
        </Link>
      </p>
    </Panel>
  );
}
