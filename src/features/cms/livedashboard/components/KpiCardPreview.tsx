import { cardTone } from '../constants';
import type { Bilingual } from '../types/livedashboard.types';

/*
 * One KPI card as the website draws it (`.pub-kpi`): the title in small capitals, the figure large in the tone's
 * colour, the detail line under it, and the tone's colour on the left edge — in Marathi, the site's default
 * language, with the English under it.
 */
export default function KpiCardPreview({ label, value, detail, tone }: { label: Bilingual; value: string; detail: Bilingual; tone: string }) {
  const t = cardTone(tone);
  return (
    <div className="grid g2">
      {(['mr', 'en'] as const).map((lang) => (
        <div
          key={lang}
          lang={lang}
          data-testid={`kpi-preview-${lang}`}
          style={{
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${t.edge}`,
            borderRadius: 14,
            padding: '14px 16px',
            minWidth: 0,
          }}
        >
          <div className="muted" style={{ fontSize: 12, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {label[lang] || '—'}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 27, fontWeight: 700, color: t.figure, lineHeight: 1.1, marginTop: 5 }}>
            {value || '—'}
          </div>
          {detail[lang] ? <div className="muted fs12 mt4">{detail[lang]}</div> : null}
        </div>
      ))}
    </div>
  );
}
