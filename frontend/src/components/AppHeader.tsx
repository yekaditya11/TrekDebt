import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

export function AppHeader({
  title,
  subtitle,
  backTo,
}: {
  title: string
  subtitle?: string
  backTo?: string
}) {
  return (
    <header className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        {backTo ? (
          <Link
            to={backTo}
            className="inline-flex text-sm font-medium text-pine-700 hover:text-pine-900"
          >
            ← Back
          </Link>
        ) : (
          <span />
        )}
        <ThemeToggle />
      </div>
      <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-trail">
        TrekDebt™
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-pine-950 sm:text-4xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-2 max-w-xl text-sm text-stone-muted sm:text-base">{subtitle}</p> : null}
    </header>
  )
}
