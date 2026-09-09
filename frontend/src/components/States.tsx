export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-muted">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-pine-100 border-t-pine-600"
        aria-hidden
      />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-line bg-panel/50 px-5 py-10 text-center">
      <p className="font-display text-lg font-semibold text-pine-900">{title}</p>
      <p className="mt-1 text-sm text-stone-muted">{description}</p>
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-danger-soft px-4 py-3 text-sm text-danger">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 font-semibold underline underline-offset-2"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function SuccessToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,24rem)] -translate-x-1/2 rounded-2xl bg-pine-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg animate-[fadeUp_0.25s_ease-out]">
      {message}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}
