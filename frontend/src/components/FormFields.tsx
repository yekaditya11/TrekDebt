import { useEffect, useId, useRef, useState } from 'react'
import type {
  CSSProperties,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

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

export interface DropdownOption {
  value: string
  label: string
}

interface DropdownSelectProps {
  label: string
  id?: string
  error?: string
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  disabled?: boolean
}

/** Custom menu-style select with checkmark on the active option. */
export function DropdownSelect({
  label,
  id,
  error,
  value,
  options,
  onChange,
  disabled,
}: DropdownSelectProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const listId = `${fieldId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const selected = options.find((opt) => opt.value === value) ?? options[0]

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 220 && rect.top > spaceBelow
    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 80,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        const target = event.target as HTMLElement | null
        if (target?.closest(`[data-dropdown-menu="${fieldId}"]`)) return
        setOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function onReposition() {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < 220 && rect.top > spaceBelow
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 80,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      })
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, fieldId])

  return (
    <div ref={rootRef} className="relative block space-y-1.5">
      <span className="text-sm font-medium text-stone-ink" id={`${fieldId}-label`}>
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        id={fieldId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${fieldId}-label`}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`${fieldClass} flex items-center justify-between gap-2 text-left ${
          open ? 'border-pine-500 ring-2 ring-pine-100' : ''
        }`}
      >
        <span>{selected?.label ?? 'Select'}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-stone-muted transition ${open ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          data-dropdown-menu={fieldId}
          aria-labelledby={`${fieldId}-label`}
          style={menuStyle}
          className="max-h-60 overflow-auto rounded-xl border border-stone-line bg-panel p-1.5 shadow-lg shadow-pine-950/20"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    isSelected
                      ? 'bg-pine-50 font-semibold text-pine-950'
                      : 'text-stone-ink hover:bg-pine-50/70'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center ${
                      isSelected ? 'text-pine-800' : 'text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                      <path
                        d="M3.5 8.5L6.5 11.5L12.5 4.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {error ? <span className="block text-xs text-danger">{error}</span> : null}
    </div>
  )
}
