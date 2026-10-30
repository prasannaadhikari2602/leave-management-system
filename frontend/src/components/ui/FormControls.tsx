import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, error, hint, required, htmlFor, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-black">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  wrapperClassName?: string;
}

export const TextInput = forwardRef<HTMLInputElement, BaseProps & InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ label, error, hint, required, wrapperClassName, className, id, name, ...rest }, ref) {
    const inputId = id ?? name;
    return (
      <Field label={label} error={error} hint={hint} required={required} htmlFor={inputId} className={wrapperClassName}>
        <input
          ref={ref}
          id={inputId}
          name={name}
          aria-invalid={!!error}
          className={cn("input-base", error && "input-error", className)}
          {...rest}
        />
      </Field>
    );
  },
);

export const SelectInput = forwardRef<HTMLSelectElement, BaseProps & SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectInput({ label, error, hint, required, wrapperClassName, className, id, name, children, ...rest }, ref) {
    const inputId = id ?? name;
    return (
      <Field label={label} error={error} hint={hint} required={required} htmlFor={inputId} className={wrapperClassName}>
        <select
          ref={ref}
          id={inputId}
          name={name}
          aria-invalid={!!error}
          className={cn("input-base", error && "input-error", className)}
          {...rest}
        >
          {children}
        </select>
      </Field>
    );
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ label, error, hint, required, wrapperClassName, className, id, name, rows = 3, ...rest }, ref) {
    const inputId = id ?? name;
    return (
      <Field label={label} error={error} hint={hint} required={required} htmlFor={inputId} className={wrapperClassName}>
        <textarea
          ref={ref}
          id={inputId}
          name={name}
          rows={rows}
          aria-invalid={!!error}
          className={cn("input-base resize-y", error && "input-error", className)}
          {...rest}
        />
      </Field>
    );
  },
);

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, error, id, name, className, ...rest },
  ref,
) {
  const inputId = id ?? name;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-3">
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-600"
          {...rest}
        />
        <span>
          <span className="block text-sm font-medium text-black">{label}</span>
          {description && <span className="block text-xs text-slate-500">{description}</span>}
        </span>
      </label>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});
