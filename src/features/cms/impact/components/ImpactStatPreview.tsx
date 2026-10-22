import type { Bilingual } from '../types/impact.types';

/*
 * The card as the public website draws it (.impact-row > div in amrut-public.css), in Marathi and
 * English side by side: the figure in large type and the label under it. Text is rendered as text,
 * exactly as the site does.
 */
export default function ImpactStatPreview({ value, label }: { value: string; label: Bilingual }) {
  const card = (lang: 'mr' | 'en') => (
    <div
      lang={lang}
      aria-label={lang === 'mr' ? 'Marathi preview' : 'English preview'}
      role="figure"
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '18px 12px',
        textAlign: 'center',
        width: 220,
        maxWidth: '100%',
      }}
    >
      <b style={{ display: 'block', fontFamily: 'var(--serif)', fontSize: 34, color: 'var(--brand-600)', lineHeight: 1.05 }}>
        {value.trim() ? value : <span className="muted">0</span>}
      </b>
      <span style={{ fontSize: 12.5, color: 'var(--text-2)', whiteSpace: 'normal' }}>
        {label[lang] || <span className="muted">{lang === 'mr' ? 'लेबल' : 'Label'}</span>}
      </span>
    </div>
  );

  return (
    <div className="f gp14 wrap">
      {card('mr')}
      {card('en')}
    </div>
  );
}
