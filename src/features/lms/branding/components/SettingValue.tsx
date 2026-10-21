import { Badge } from '../../../../components/ui';
import type { BrandingConfigState } from '../services/brandingOverview';
import type { BrandingColours, BrandingLogo, BrandingSetting, PlatformLanguage } from '../types/branding.types';
import { languageLabel, logoMeta } from './format';

/* A small colour chip with its hex code. */
export function Swatch({ hex, label }: { hex: string; label?: string }) {
  return (
    <span className="f ac gp4" style={{ display: 'inline-flex' }}>
      <span
        aria-hidden="true"
        style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: hex, border: '1px solid var(--border-strong)', flex: 'none' }}
      />
      <span className="mono fs12">{label ? `${label} ${hex}` : hex}</span>
    </span>
  );
}

/* Where the value a learner sees comes from: the stored value, a default, or nothing. */
export function SourceBadge({ setting }: { setting: BrandingSetting }) {
  if (setting.hasValue) return <Badge tone="green">{setting.sensitive ? 'Set (hidden)' : 'Set'}</Badge>;
  switch (setting.fallback) {
    case 'entity_name':
      return <Badge tone="blue">Default · entity name</Badge>;
    case 'default_language':
      return <Badge tone="blue">Default · default language</Badge>;
    case 'platform':
      return <Badge tone="grey">Platform default</Badge>;
    default:
      return setting.required ? <Badge tone="red">Missing · required</Badge> : <Badge tone="grey">Not set</Badge>;
  }
}

/* Configuration state of an entity on the listing. */
export function ConfigBadge({ state, missing }: { state: BrandingConfigState; missing?: string[] }) {
  if (state === 'error') return <Badge tone="red">Could not load</Badge>;
  if (state === 'missing') {
    return (
      <span title={missing?.length ? `Missing: ${missing.join(', ')}` : undefined}>
        <Badge tone="amber">Missing required</Badge>
      </span>
    );
  }
  return <Badge tone="green">Complete</Badge>;
}

const none = (text: string) => <span className="muted">{text}</span>;

/*
 * The value a learner client uses for one setting (its effective value), shown by the setting's type.
 * Unknown types (a key added to the catalogue later) fall back to their JSON.
 */
export function SettingValue({ setting, languages }: { setting: BrandingSetting; languages?: PlatformLanguage[] }) {
  const v = setting.effectiveValue;
  if (setting.sensitive) return setting.hasValue ? none('Stored, not shown') : none('Not set');
  switch (setting.type) {
    case 'text':
    case 'email':
    case 'phone':
      return typeof v === 'string' && v ? <span style={{ wordBreak: 'break-word' }}>{v}</span> : none(setting.fallback === 'platform' ? 'Platform default' : '—');
    case 'image': {
      const logo = v as BrandingLogo | null;
      return logo ? <span className="fs12" style={{ wordBreak: 'break-all' }}>{logoMeta(logo)}</span> : none('Platform default logo');
    }
    case 'colour_pair': {
      const c = v as BrandingColours | null;
      if (!c || (!c.primary && !c.accent)) return none('Platform default colours');
      return (
        <span className="f ac gp8 wrap">
          {c.primary ? <Swatch hex={c.primary} label="Primary" /> : <span className="fs12 muted">Primary: platform default</span>}
          {c.accent ? <Swatch hex={c.accent} label="Accent" /> : <span className="fs12 muted">Accent: platform default</span>}
        </span>
      );
    }
    case 'text_per_language': {
      const entries = Object.entries((v ?? {}) as Record<string, string>).filter(([, t]) => t);
      if (!entries.length) return none('—');
      return (
        <span style={{ display: 'grid', gap: 2 }}>
          {entries.map(([code, text]) => (
            <span key={code} className="fs12">
              <span className="muted">{languageLabel(code, languages)}:</span> {text}
            </span>
          ))}
        </span>
      );
    }
    case 'language_list': {
      const codes = Array.isArray(v) ? (v as string[]) : [];
      return codes.length ? <span>{codes.map((c) => languageLabel(c, languages)).join(', ')}</span> : none('—');
    }
    default:
      return v === null || v === undefined ? none('—') : <span className="mono fs12">{JSON.stringify(v)}</span>;
  }
}

/*
 * How the entity's header could look with these settings: the display name on the primary colour and an accent
 * button. A sketch for judging colours, not the learner app itself. Empty colours show the panel's own colours.
 */
export function BrandPreview({ displayName, primary, accent }: { displayName: string; primary: string | null; accent: string | null }) {
  return (
    <div aria-label="Theme preview" role="img" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
      <div style={{ background: primary || 'var(--brand-700)', color: '#FFFFFF', padding: '10px 12px', fontWeight: 700, wordBreak: 'break-word' }}>
        {displayName}
      </div>
      <div className="f ac gp8 wrap" style={{ padding: '10px 12px', background: 'var(--surface)' }}>
        <span style={{ background: accent || 'var(--saffron)', color: '#FFFFFF', padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600 }}>
          Accent button
        </span>
        <span style={{ color: primary || 'var(--brand-700)', fontSize: 12, fontWeight: 600 }}>Primary link text</span>
      </div>
    </div>
  );
}
