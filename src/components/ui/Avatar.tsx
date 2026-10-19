export default function Avatar({ name, cls = '' }: { name: string; cls?: string }) {
  const initials = String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return <div className={'avatar ' + cls}>{initials}</div>;
}
