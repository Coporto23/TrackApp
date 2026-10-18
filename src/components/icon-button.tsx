"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  tone?: "default" | "ember" | "danger";
};

const TONES = {
  default: "text-fog hover:text-bone",
  ember: "text-ember-bright hover:text-ember",
  danger: "text-fog hover:text-blood",
};

// Botón cuadrado de 44px (tamaño táctil mínimo) con solo icono. Si es de tipo
// submit, se deshabilita mientras su formulario se envía.
export function IconButton({ label, children, tone = "default", className = "", ...props }: IconButtonProps) {
  const { pending } = useFormStatus();
  const isSubmit = (props.type ?? "submit") === "submit";

  return (
    <button
      aria-label={label}
      title={label}
      disabled={isSubmit && pending}
      className={`flex h-11 w-11 shrink-0 items-center justify-center transition-colors disabled:opacity-40 ${TONES[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
