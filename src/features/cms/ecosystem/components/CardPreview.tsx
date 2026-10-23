import Icon from '../../../../components/ui/Icon';
import type { Bilingual } from '../types/ecosystem.types';

/*
 * The card as the public website draws it (.vert-card in amrut-public.css), in Marathi and English
 * side by side. A card with a destination gets the highlighted ("live") style there too. Text is
 * rendered as text, exactly as the site does.
 */
export default function CardPreview({
  name,
  description,
  icon,
  linked,
  linkLabel,
}: {
  name: Bilingual;
  description: Bilingual;
  icon: string;
  linked: boolean;
  linkLabel: Bilingual;
}) {
  const card = (lang: 'mr' | 'en') => (
    <div
      lang={lang}
      aria-label={lang === 'mr' ? 'Marathi preview' : 'English preview'}
      role="figure"
      style={{
        background: linked ? 'linear-gradient(180deg,#fff,#FFF6EC)' : '#fff',
        border: `1px solid ${linked ? 'var(--brand-600)' : 'var(--border)'}`,
        borderRadius: 14,
        padding: '18px 16px',
        textAlign: 'center',
        width: 220,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: 'var(--saffron-100)',
          color: 'var(--brand-600)',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 11px',
        }}
      >
        {icon ? <Icon name={icon} /> : null}
      </div>
      <b style={{ fontFamily: 'var(--serif)', display: 'block', fontSize: 16, color: 'var(--maroon)' }}>
        {name[lang] || <span className="muted">{lang === 'mr' ? 'नाव' : 'Name'}</span>}
      </b>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginTop: 5, minHeight: 32 }}>
        {description[lang] || <span className="muted">{lang === 'mr' ? 'वर्णन' : 'Description'}</span>}
      </span>
      <em style={{ display: 'block', fontStyle: 'normal', fontSize: 12, color: 'var(--brand-600)', fontWeight: 650, marginTop: 9 }}>
        {linkLabel[lang]}
      </em>
    </div>
  );

  return (
    <div className="f gp14 wrap">
      {card('mr')}
      {card('en')}
    </div>
  );
}
