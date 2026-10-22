import { useState } from 'react';
import { EmptyState } from '../../../../components/ui';
import type { ApiError } from '../../../../services/api-client';
import { LoadState } from '../../../cms/shared';
import type { EffectiveFormConfiguration, FormFieldFormOptions } from '../types/formField.types';
import FieldPreview from './FieldPreview';

interface EffectivePreviewProps {
  config: EffectiveFormConfiguration | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
  languages: FormFieldFormOptions['languages'];
  fileConstraints?: FormFieldFormOptions['fileConstraints'];
}

/*
 * The effective form (AD-12, UI-361 preview), from GET /lms/form-fields/forms/:formCode/effective: the visible,
 * active fields by section in display order — exactly what the form renders and the server enforces on the
 * next request. Hidden and archived fields are not part of it. The language switch shows the per-language labels.
 */
export default function EffectivePreview({ config, loading, error, onRetry, languages, fileConstraints }: EffectivePreviewProps) {
  const [lang, setLang] = useState('');
  const fields = config?.sections.flatMap((s) => s.fields) ?? [];
  const compulsory = fields.filter((f) => f.isRequired).length;

  return (
    <div className="card">
      <div className="card-h">
        <h3>
          Effective form{config ? ` — ${config.form.label}` : ''}
          {config ? <span className="sub"> {config.form.specRef}</span> : null}
        </h3>
        {config ? (
          <div className="f ac gp4 wrap" role="group" aria-label="Preview language">
            {[{ code: '', label: 'Default' }, ...languages].map((l) => (
              <button
                key={l.code || 'default'}
                type="button"
                className={'btn xs' + (lang === l.code ? ' primary' : '')}
                aria-pressed={lang === l.code}
                onClick={() => setLang(l.code)}
              >
                {l.code ? `${l.label} (${l.code})` : l.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="card-b">
        <LoadState loading={loading && !config} error={error} onRetry={onRetry} />
        {config ? (
          fields.length ? (
            <>
              <p className="muted fs12" style={{ margin: '0 0 12px' }}>
                {fields.length} visible {fields.length === 1 ? 'field' : 'fields'} in {config.sections.length}{' '}
                {config.sections.length === 1 ? 'section' : 'sections'} · {compulsory} compulsory. This is what the form shows and the server
                checks on the next request; hidden and archived fields are left out.
                {lang ? ' A field without a label in this language shows its default label.' : ''}
              </p>
              {config.sections.map((s) => (
                <section key={s.code} aria-label={`Section ${s.label}`} style={{ marginBottom: 18 }}>
                  <h4 className="fs13" style={{ margin: '0 0 8px' }}>
                    <span className="mono">{s.code}</span> · {s.label}
                    {s.isCustomSection ? <span className="tag" style={{ marginLeft: 6 }}>Custom section</span> : null}
                  </h4>
                  <div className="grid g2">
                    {s.fields.map((f) => (
                      <FieldPreview key={f.fieldCode} field={f} lang={lang} fileConstraints={fileConstraints} idPrefix="eff" />
                    ))}
                  </div>
                </section>
              ))}
            </>
          ) : (
            <EmptyState title="No visible field" msg="Every field of this form is hidden or archived, so the form shows nothing yet." />
          )
        ) : null}
      </div>
    </div>
  );
}
