import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { LoadState, toastError, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { homeService } from '../services/homeService';
import type { ApiHomeGlance } from '../types/home.types';

const FORM_ID = 'cms-home-form';

/*
 * Edit the home page's "Programme at a glance" card.
 *
 * Only one field is editable, so this is a page rather than a modal for consistency with the other
 * CMS editors, but there is no separate Form component: one input does not earn one.
 *
 * The three derived figures are shown disabled beside it, because the point of this screen is to
 * see what the card will say — a lone district box with no context would be worse than useless.
 */
export default function HomeGlanceEdit() {
  usePageTitle('Edit Home Page Figures');
  const navigate = useNavigate();
  const detail = useApiData(() => homeService.get(), []);

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '/dashboard' },
          { l: 'CMS' },
          { l: 'Home Page Figures', link: '/cms/home' },
          { l: 'Edit' },
        ]}
        title="Edit Home Page Figures"
        sub="Only the district count is entered; the rest are summed from the modules."
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {detail.data ? (
        <GlanceForm
          initial={detail.data}
          onSaved={() => {
            toastOk('Home page figures updated');
            navigate('/cms/home');
          }}
        />
      ) : null}
    </div>
  );
}

function GlanceForm({ initial, onSaved }: { initial: ApiHomeGlance; onSaved: () => void }) {
  const [districts, setDistricts] = useState(String(initial.districtCount));
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const dirty = districts !== String(initial.districtCount);

  const localError = (() => {
    const v = districts.trim();
    if (!v) return 'District count is required';
    const n = Number(v);
    if (!Number.isFinite(n)) return 'District count must be a number';
    if (!Number.isInteger(n)) return 'District count must be a whole number';
    if (n < 0) return 'District count cannot be negative';
    if (n > 9999) return 'District count is too large';
    return undefined;
  })();

  const error = (submitted || touched ? localError : undefined) ?? serverError;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (busy || localError) return;

    setBusy(true);
    setServerError(undefined);
    try {
      await homeService.update({ districtCount: Number(districts.trim()) });
      onSaved();
    } catch (err) {
      /* A 422 names the field; anything else is a toast rather than a message on one input. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400)) {
        const detail = err.details.find((d) => d.field?.endsWith('districtCount'));
        if (detail) {
          setServerError(detail.message);
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <Callout tone="info" title="Three of these four are worked out, not entered">
          Total hours, modules and employment domains are summed from the modules on the Modules
          Page screen, so they can never disagree with it. To change them, change the modules.
        </Callout>

        <div className="card mt14">
          <div className="card-h">
            <h3>Programme at a glance</h3>
          </div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField id="glance-hours" label="Total hours">
                <input className="inp" type="text" value={initial.totalHours} readOnly disabled />
              </MasterField>
              <MasterField id="glance-modules" label="Modules">
                <input className="inp" type="text" value={initial.modulesLabel} readOnly disabled />
              </MasterField>
              <MasterField id="glance-domains" label="Employment domains">
                <input className="inp" type="text" value={initial.domains} readOnly disabled />
              </MasterField>

              <MasterField
                id="districtCount"
                label="Districts"
                required
                error={error}
                hint="The headline figure on the home page only — the map and the district pages are drawn from the programme dataset."
              >
                <input
                  className="inp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  {...fieldAria('districtCount', error)}
                  value={districts}
                  onChange={(e) => {
                    setDistricts(e.target.value);
                    setServerError(undefined);
                  }}
                  onBlur={() => setTouched(true)}
                />
              </MasterField>
            </div>

            {initial.hiddenModules > 0 ? (
              <p className="muted fs12 mt10">
                {initial.hiddenModules} module{initial.hiddenModules === 1 ? ' is' : 's are'} hidden,
                so {initial.hiddenModules === 1 ? 'it is' : 'they are'} left out of the figures above
                and out of the website.
              </p>
            ) : null}
          </div>
        </div>
      </form>

      <MasterFormActions
        formId={FORM_ID}
        submitLabel="Save figures"
        busy={busy}
        dirty={dirty}
        backTo="/cms/home"
      />
    </>
  );
}
