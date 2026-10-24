import type { Bilingual } from '../types/topbar.types';

/*
 * The language switch of the website's strip: a pill with both native names, Marathi on the left and English on
 * the right, and the active language highlighted. On the site it flips the language when clicked; here it only
 * shows how the strip will look.
 */
function LanguageSwitchPreview({ active }: { active: 'mr' | 'en' }) {
  return (
    <span
      title="Language switch"
      style={{
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        borderRadius: 999,
        border: '1px solid var(--border-strong)',
        background: '#fff',
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.2,
      }}
    >
      {(['mr', 'en'] as const).map((l) => (
        <span
          key={l}
          data-active={l === active}
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            background: l === active ? 'var(--maroon)' : 'transparent',
            color: l === active ? '#fff' : 'var(--maroon)',
          }}
        >
          {l === 'mr' ? 'मराठी' : 'English'}
        </span>
      ))}
    </span>
  );
}

/*
 * The strip at the very top of the website (.gov-strip in amrut-public.css): the government name in bold on the
 * left, the link buttons, and the language switch on the right when it is enabled. In Marathi and English, one
 * strip each. Text is rendered as text, exactly as the site does.
 */
export default function TopBarPreview({
  governmentName,
  showLanguageToggle,
  buttons,
}: {
  /* Null (or blank in both languages): the bold text is left out. */
  governmentName: Bilingual | null;
  showLanguageToggle: boolean;
  /*
   * The link buttons, left to right. A blank label draws a placeholder; a link that is not a page of the site
   * (typed so far or saved) gets an arrow, as in the announcements preview.
   */
  buttons: { label: Bilingual; link: string }[];
}) {
  const strip = (lang: 'mr' | 'en') => {
    const name = governmentName?.[lang].trim();
    return (
      <div
        lang={lang}
        aria-label={lang === 'mr' ? 'Marathi preview' : 'English preview'}
        role="figure"
        style={{
          background: '#FDF1E3',
          border: '1px solid #F2DCC2',
          borderRadius: 8,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {name ? (
          <b style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--maroon)', fontWeight: 600, letterSpacing: '.2px' }}>{name}</b>
        ) : null}
        <span style={{ flex: 1 }} />
        {buttons.map((b, at) => (
          <span
            key={at}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 30,
              padding: '0 12px',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              background: '#fff',
              color: 'var(--maroon)',
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {b.label[lang].trim() || <span style={{ opacity: 0.6 }}>{lang === 'mr' ? 'बटणाचा मजकूर' : 'Button label'}</span>}
            {b.link.trim() && !b.link.trim().startsWith('/') ? <span aria-label="opens another site"> ↗</span> : null}
          </span>
        ))}
        {showLanguageToggle ? <LanguageSwitchPreview active={lang} /> : null}
      </div>
    );
  };

  return (
    <div className="fc gp8">
      {strip('mr')}
      {strip('en')}
    </div>
  );
}
