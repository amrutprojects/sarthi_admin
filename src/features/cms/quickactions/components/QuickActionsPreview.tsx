import Icon from '../../../../components/ui/Icon';
import type { Bilingual } from '../types/quickactions.types';

export interface PreviewTile {
  icon: string;
  title: Bilingual;
  /* Blank in a language (or null): that language's tile shows the title alone. */
  subtitle: Bilingual | null;
}

/*
 * The quick-action strip under the home page banner (.quick-strip in amrut-public.css): one tile per action, each
 * its icon on a rounded saffron square, then the bold title and the muted subtitle under it. As on the website, the
 * row has as many columns as there are tiles, up to four, and more tiles wrap onto further rows. In Marathi and
 * English, one strip each. Text is rendered as text, exactly as the site does.
 */
export default function QuickActionsPreview({
  tiles,
}: {
  /* The tiles, left to right. A blank title draws a placeholder, and an icon not picked yet an empty square. */
  tiles: PreviewTile[];
}) {
  if (!tiles.length) {
    return <p className="muted fs13">No tile is shown: the website leaves the strip out while no quick action is active.</p>;
  }

  const strip = (lang: 'mr' | 'en') => (
    <div
      lang={lang}
      aria-label={lang === 'mr' ? 'Marathi preview' : 'English preview'}
      role="figure"
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 8,
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(tiles.length, 4)}, minmax(0, 1fr))`,
      }}
    >
      {tiles.map((t, at) => {
        const title = t.title[lang].trim();
        const subtitle = t.subtitle?.[lang].trim();
        return (
          <div
            key={at}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 12px',
              borderRight: (at + 1) % 4 && at < tiles.length - 1 ? '1px solid var(--border)' : undefined,
              borderTop: at >= 4 ? '1px solid var(--border)' : undefined,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 38,
                height: 38,
                flex: '0 0 38px',
                borderRadius: 10,
                background: 'var(--saffron-100)',
                color: 'var(--brand-600)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {t.icon ? <Icon name={t.icon} /> : null}
            </span>
            <span style={{ minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 14, color: 'var(--text)', overflowWrap: 'anywhere' }}>
                {title || <span style={{ opacity: 0.6 }}>{lang === 'mr' ? 'शीर्षक' : 'Title'}</span>}
              </b>
              {subtitle ? (
                <span className="muted" style={{ display: 'block', fontSize: 13, overflowWrap: 'anywhere' }}>
                  {subtitle}
                </span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fc gp8">
      {strip('mr')}
      {strip('en')}
    </div>
  );
}
