import type { Bilingual } from '../types/announcements.types';

/*
 * One announcement as the website's ticker draws it (.demo-ribbon strip in amrut-public.css): the ticker's label
 * in a small pill, then "title — detail", underlined when the item is a link. In Marathi and English, one strip
 * each. On the site the items scroll continuously from right to left; here the strip stands still so it can be
 * read. Text is rendered as text, exactly as the site does.
 */
export default function AnnouncementPreview({
  label,
  title,
  detail,
  link,
}: {
  label: Bilingual;
  title: Bilingual;
  detail: Bilingual;
  /** Blank for a plain-text item. */
  link: string;
}) {
  const strip = (lang: 'mr' | 'en') => (
    <div
      lang={lang}
      aria-label={lang === 'mr' ? 'Marathi preview' : 'English preview'}
      role="figure"
      style={{
        background: '#4A2109',
        color: 'var(--brand-100)',
        borderRadius: 8,
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: '.02em',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          flex: 'none',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '.06em',
          padding: '2px 9px',
          borderRadius: 999,
          background: 'var(--saffron)',
          color: '#fff',
          whiteSpace: 'nowrap',
        }}
      >
        {label[lang]}
      </span>
      <span
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          textDecoration: link.trim() ? 'underline' : undefined,
          textUnderlineOffset: 3,
        }}
      >
        <b>{title[lang] || <span style={{ opacity: 0.6 }}>{lang === 'mr' ? 'सूचनेचे शीर्षक' : 'Announcement title'}</span>}</b>
        {detail[lang].trim() ? <> — {detail[lang]}</> : null}
        {link.trim() && !link.trim().startsWith('/') ? <span aria-label="opens another site"> ↗</span> : null}
      </span>
    </div>
  );

  return (
    <div className="fc gp8">
      {strip('mr')}
      {strip('en')}
    </div>
  );
}
