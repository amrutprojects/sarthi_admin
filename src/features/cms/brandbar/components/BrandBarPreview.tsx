import type { Bilingual } from '../types/brandbar.types';

/*
 * The white bar under the website's top strip: the bold title and the two full-name lines on the left, and the
 * implementation partner on the right. One bar per language, because only the partner's small label follows the
 * visitor's language; the full-name lines are shown together in both. Text is rendered as text, exactly as the
 * site does.
 */
export default function BrandBarPreview({
  title,
  fullName,
  partnerLabel,
  partnerName,
}: {
  title: string;
  /* A blank line is left out. */
  fullName: Bilingual;
  /* Blank (in the bar's language): the small label is left out. */
  partnerLabel: Bilingual;
  /* Blank: the whole partner block is left out. */
  partnerName: string;
}) {
  const bar = (lang: 'mr' | 'en') => {
    const label = partnerLabel[lang].trim();
    const partner = partnerName.trim();
    return (
      <div
        lang={lang}
        aria-label={lang === 'mr' ? 'Marathi preview' : 'English preview'}
        role="figure"
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <b
            style={{
              display: 'block',
              fontFamily: 'var(--serif)',
              fontSize: 20,
              color: 'var(--maroon)',
              fontWeight: 700,
              letterSpacing: '.4px',
            }}
          >
            {title.trim() || <span style={{ opacity: 0.6 }}>{lang === 'mr' ? 'शीर्षक' : 'Title'}</span>}
          </b>
          {fullName.mr.trim() ? (
            <div lang="mr" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
              {fullName.mr.trim()}
            </div>
          ) : null}
          {fullName.en.trim() ? (
            <div lang="en" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {fullName.en.trim()}
            </div>
          ) : null}
        </div>
        <span style={{ flex: 1 }} />
        {partner ? (
          <div style={{ textAlign: 'right' }}>
            {label ? <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div> : null}
            <b style={{ fontSize: 13.5, color: 'var(--maroon)', fontWeight: 700 }}>{partner}</b>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="fc gp8">
      {bar('mr')}
      {bar('en')}
    </div>
  );
}
