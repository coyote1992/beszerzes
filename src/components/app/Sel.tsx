import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type Opt = [string, string]
const ALL = '__all'
/** Thin wrapper: string options, '' mapped to a sentinel so "all" works as a value */
export function Sel({ value, onChange, options, className, size, name }: { value: string; onChange: (v: string) => void; options: Opt[]; className?: string; size?: 'sm' | 'default'; name?: string }) {
  const enc = (v: string) => (v === '' ? ALL : v)
  const items = options.map(([v, l]) => ({ value: enc(v), label: l }))
  return (
    <Select value={enc(value)} onValueChange={(v: string) => onChange(v === ALL ? '' : v)} items={items} name={name}>
      <SelectTrigger className={className} size={size}><SelectValue /></SelectTrigger>
      <SelectContent>{items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
    </Select>
  )
}
