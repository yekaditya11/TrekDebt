import { useEffect, useState } from 'react'
import { Button } from './Button'
import { copyText } from '../utils'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      onClick={async () => {
        const ok = await copyText(url)
        if (ok) setCopied(true)
      }}
    >
      {copied ? 'Copied. Go spam WhatsApp.' : 'Copy chaos link'}
    </Button>
  )
}
