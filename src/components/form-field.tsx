import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  errors?: string[];
};

export function FormField({ name, label, errors, ...inputProps }: FormFieldProps) {
  const errorId = `${name}-error`;
  const hasError = Boolean(errors?.length);

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block font-display text-xs tracking-[0.15em] text-fog uppercase">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="field"
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        {...inputProps}
      />
      {hasError && (
        <p id={errorId} className="text-sm text-blood">
          {errors![0]}
        </p>
      )}
    </div>
  );
}
