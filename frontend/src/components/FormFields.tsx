import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const fieldClass =
  'w-full rounded-xl border border-stone-line bg-panel px-3.5 py-2.5 text-sm text-stone-ink outline-none transition placeholder:text-stone-muted/70 focus:border-pine-500 focus:ring-2 focus:ring-pine-100'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}

export function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <label className="block space-y-1.5" htmlFor={htmlFor}>
      <span className="text-sm font-medium text-stone-ink">{label}</span>
      {children}
      {error ? <span className="block text-xs text-danger">{error}</span> : null}
    </label>
  )
}

export function TextInput({
  label,
  id,
  error,
  ...props
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} htmlFor={id ?? props.name ?? 'input'} error={error}>
      <input id={id} className={fieldClass} {...props} />
    </Field>
  )
}

export function TextArea({
  label,
  id,
  error,
  ...props
}: { label: string; error?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} htmlFor={id ?? props.name ?? 'textarea'} error={error}>
      <textarea id={id} className={`${fieldClass} min-h-24 resize-y`} {...props} />
    </Field>
  )
}

export function SelectInput({
  label,
  id,
  error,
  children,
  ...props
}: { label: string; error?: string; children: React.ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} htmlFor={id ?? props.name ?? 'select'} error={error}>
      <select id={id} className={fieldClass} {...props}>
        {children}
      </select>
    </Field>
  )
}
