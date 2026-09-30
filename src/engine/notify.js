// @ts-nocheck
import { toast } from 'sonner'
export function notify(msg, tone) {
  if (tone === 'bad') return toast.error(msg)
  if (tone === 'ok') return toast.success(msg)
  return toast(msg)
}
