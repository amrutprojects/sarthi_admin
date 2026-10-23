import { fmtDeadline } from '../constants';
import type { Bilingual } from '../types/schemes.types';

const LAST_DATE: Bilingual = { mr: 'अंतिम दिनांक', en: 'Last date' };

/*
 * The card as the public website draws it (.scheme-card in amrut-public.css), in Marathi and English
 * side by side: the optional badge, title, description, last date and button. A highlighted card gets
 * the saffron style there too. Text is rendered as text, exactly as the site does.
 */
export default function SchemeCardPreview({
  title,
  description,
  badge,
  deadline,
  buttonLabel,
  featured,
}: {
  title: Bilingual;
  description: Bilingual;
  badge: Bilingual;
  /** "YYYY-MM-DD", or blank for none. */
  deadline: string;
  buttonLabel: Bilingual;
  featured: boolean;
}) {
  const card = (lang: 'mr' | 'en') => (
    <div
      lang={lang}
      aria-label={lang === 'mr' ? 'Marathi preview' : 'English preview'}
      role="figure"
      style={{
        background: featured ? 'linear-gradient(180deg,#FFFBF5,#fff)' : '#fff',
        border: `1px solid ${featured ? 'var(--saffron)' : 'var(--border)'}`,
        borderRadius: 14,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        width: 320,
        maxWidth: '100%',
      }}
    >
      {badge[lang].trim() ? (
        <span
          style={{
            alignSelf: 'flex-start',
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.06em',
            padding: '2px 8px',
            borderRadius: 5,
            background: 'var(--saffron-100)',
            color: 'var(--brand-700)',
            marginBottom: 7,
          }}
        >
          {badge[lang]}
        </span>
      ) : null}
      <b style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--maroon)', lineHeight: 1.3 }}>
        {title[lang] || <span className="muted">{lang === 'mr' ? 'योजनेचे नाव' : 'Scheme title'}</span>}
      </b>
      <span style={{ fontSize: 12.8, color: 'var(--text-2)', margin: '9px 0 0', lineHeight: 1.6, flex: 1, whiteSpace: 'normal' }}>
        {description[lang] || <span className="muted">{lang === 'mr' ? 'वर्णन' : 'Description'}</span>}
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px dashed var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {deadline ? (
          <span style={{ fontSize: 11.5, color: 'var(--red)', fontWeight: 650 }}>
            {LAST_DATE[lang]}: {fmtDeadline(deadline)}
          </span>
        ) : null}
        <span style={{ flex: 1 }} />
        <span className="btn xs primary" aria-hidden="true">
          {buttonLabel[lang]}
        </span>
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
