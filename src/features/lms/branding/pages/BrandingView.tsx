import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KvList, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import { LoadState, fmtDateTime, useApiData } from '../../../cms/shared';
import { usePageTitle } from '../../../cms/useMasterQuery';
import { languageLabel } from '../components/format';
import LogoPreview from '../components/LogoPreview';
import { BrandPreview, SettingValue, SourceBadge } from '../components/SettingValue';
import { coloursOf, lastUpdated, logoOf, missingLabels, valuesSet } from '../services/brandingOverview';
import { brandingService } from '../services/brandingService';
import { BRANDING_GROUPS, BRANDING_GROUP_LABELS, type BrandingGroup } from '../types/branding.types';
import { settingOf } from '../validation/branding.validation';
import { contrastWarnings } from '../validation/contrast';

const LIST = '/lms/branding';

const TABS: { k: '' | BrandingGroup; l: string }[] = [{ k: '', l: 'All settings' }, ...BRANDING_GROUPS.map((g) => ({ k: g, l: BRANDING_GROUP_LABELS[g] }))];

/*
 * View Branding & Settings of one entity (UI-312): a preview of the brand, the entity, and every catalogue
 * setting with the value learners get and where it comes from. The tabs (branding / contact / settings) and the
 * "Search setting key" box are answered by the API (group / search).
 */
export default function BrandingView() {
  usePageTitle('Branding & Settings');
  const { entityId = '' } = useParams();
  const go = useGo();
  const can = useCan();
  const detail = useApiData(() => brandingService.get(entityId), [entityId]);
  const languages = useApiData(() => brandingService.languages(), []);

  const [group, setGroup] = useState<'' | BrandingGroup>('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText.trim()), 350);
    return () => clearTimeout(t);
  }, [searchText]);
  const filtering = group !== '' || search !== '';
  const filteredView = useApiData(
    () => (filtering ? brandingService.get(entityId, { group: group || undefined, search: search || undefined }) : Promise.resolve(null)),
    [entityId, group, search],
  );

  const b = detail.data;
  const platform = languages.data?.languages;
  const rows = filtering ? (filteredView.data?.settings ?? null) : (b?.settings ?? null);
  const colours = coloursOf(b);
  const displayName = b ? String(settingOf(b, 'display_name')?.effectiveValue ?? b.entity.name) : '';
  const warnings = contrastWarnings(colours?.primary ?? '', colours?.accent ?? '');
  const updated = lastUpdated(b);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Branding & Settings', link: LIST }, { l: b ? b.entity.name : 'Entity' }]}
        title={b ? b.entity.name : 'Branding & Settings'}
        badge={b ? <span className="tag">{b.entity.code}</span> : undefined}
        sub="Branding and settings of this LMS entity: what learners see in the app and on notifications."
        back={<BackButton to={LIST} />}
        actions={
          b ? (
            <div className="f ac gp8 wrap">
              <Can action="editLmsBranding">
                <button type="button" className="btn primary" onClick={() => go(`${LIST}/${b.entity.id}/edit`)}>Edit settings</button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading && !b} error={detail.error} onRetry={() => void detail.reload()} />

      {b ? (
        <>
          {b.missingRequired.length ? (
            <div className="callout c-warn mb14" role="status">
              <div>
                <b>Required setting not set: {missingLabels(b).join(', ')}. </b>
                It has no default, so learners are shown no value until it is set.{' '}
                {can('editLmsBranding') ? (
                  <button type="button" className="btn xs" onClick={() => go(`${LIST}/${b.entity.id}/edit`)}>Set it now</button>
                ) : null}
              </div>
            </div>
          ) : null}
          {!b.entity.isActive ? (
            <div className="callout c-info mb14">
              <div>This entity is inactive. Its branding and settings can be prepared now and apply once the entity is activated.</div>
            </div>
          ) : null}

          <div className="grid g2">
            <div className="card">
              <div className="card-h"><h3>Brand preview</h3></div>
              <div className="card-b">
                <LogoPreview entityId={b.entity.id} logo={logoOf(b)} alt={`Logo of ${b.entity.name}`} />
                <div style={{ marginTop: 12 }}>
                  <BrandPreview displayName={displayName} primary={colours?.primary ?? null} accent={colours?.accent ?? null} />
                </div>
                {warnings.length ? (
                  <div className="callout c-warn" role="status" style={{ marginTop: 10 }}>
                    <div>
                      <b>Contrast warning. </b>
                      {warnings.map((w) => (
                        <div key={w}>{w}</div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Entity</h3></div>
              <div className="card-b">
                <KvList
                  pairs={[
                    ['Entity name', b.entity.name],
                    ['Entity code', <span className="mono">{b.entity.code}</span>],
                    ['Default language', languageLabel(b.entity.defaultLanguage, platform)],
                    ['Entity status', <MasterStatusBadge isActive={b.entity.isActive} />],
                    ['Settings set', `${valuesSet(b)} of ${b.settings.length}`],
                    ['Last updated', updated ? fmtDateTime(updated) : 'Never set'],
                  ]}
                />
                {languages.data && !languages.data.languagesConfirmed ? (
                  <p className="muted fs12" style={{ margin: '8px 0 0' }}>
                    The platform language list is To Be Confirmed (OQ-023); English and Marathi are the recommended values.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Settings <span className="sub">typed and validated by the backend</span></h3>
              {filtering ? <span className="tag">filtered</span> : null}
            </div>
            <div className="card-b" style={{ paddingBottom: 0 }}>
              <div className="tabs" role="tablist" aria-label="Setting groups">
                {TABS.map((t) => (
                  <button type="button" role="tab" key={t.k || 'all'} aria-selected={group === t.k} className={group === t.k ? 'on' : ''} onClick={() => setGroup(t.k)}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="tbl-top">
              <div className="grow">
                <input
                  className="inp sm"
                  aria-label="Search setting key"
                  placeholder="Search setting key or label..."
                  value={searchText}
                  maxLength={100}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>
            {filtering ? <LoadState loading={filteredView.loading && !rows} error={filteredView.error} onRetry={() => void filteredView.reload()} /> : null}
            {rows ? (
              <div className="tbl-wrap" role="tabpanel" aria-label={TABS.find((t) => t.k === group)?.l}>
                <table className="tbl" aria-label="Settings" aria-busy={filtering && filteredView.loading}>
                  <thead>
                    <tr>
                      <th style={{ width: 76 }}>Sr. No.</th>
                      <th>Setting</th>
                      <th>Value learners get</th>
                      <th>Source</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map((s, i) => (
                        <tr key={s.key} className="norow">
                          <td className="muted fs12">{i + 1}</td>
                          <td style={{ minWidth: 220 }}>
                            <b>{s.label}</b>
                            {s.required ? <span style={{ color: 'var(--red)' }} title="Required"> *</span> : null}
                            <div className="muted fs12"><span className="mono">{s.key}</span> · {s.fieldId} · {BRANDING_GROUP_LABELS[s.group] ?? s.group}</div>
                            <div className="muted fs12">{s.description}</div>
                          </td>
                          <td><SettingValue setting={s} languages={platform} /></td>
                          <td><SourceBadge setting={s} /></td>
                          <td className="fs12">{s.updatedAt ? fmtDateTime(s.updatedAt) : <span className="muted">Never set</span>}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="norow">
                        <td colSpan={5} className="muted fs12">
                          No setting matches{search ? ` “${search}”` : ''}{group ? ` in ${BRANDING_GROUP_LABELS[group]}` : ''}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
