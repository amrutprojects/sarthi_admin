import { useEffect, useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Callout, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { SectionTabHead } from '../../components/SectionTabs';
import { LoadState, fmtDateTime, useApiData } from '../../shared';
import { aboutCreatePath } from '../constants';
import { aboutService, toItem } from '../services/aboutService';
import type { ApiAboutSection } from '../types/about.types';
import ItemList from './ItemList';
import { DescriptionForm, SectionSettingsForm } from './SectionForms';

/*
 * About AMRUT — the About AMRUT Management tab of Home Page Management: the "About AMRUT" (अमृत विषयी माहिती)
 * section of the home page, whose profile and cards the About page shows too. Its four areas: section settings,
 * the description, and the information rows and the Mission / Vision / Values (and any further) cards as two
 * listings like FAQ Management's.
 */
export default function AboutTab() {
  const go = useGo();
  const can = useCan();
  const data = useApiData(() => aboutService.get(), []);
  /* The section as last saved; both inline editors update it, so each saves against the latest version. */
  const [section, setSection] = useState<ApiAboutSection | null>(null);
  useEffect(() => {
    if (data.data) setSection(data.data.section);
  }, [data.data]);
  /* The same arrays between renders, so each table re-sorts only when the list or its query changes. */
  const facts = useMemo(() => (data.data?.facts ?? []).map((f) => toItem('facts', f)), [data.data]);
  const cards = useMemo(() => (data.data?.cards ?? []).map((c) => toItem('cards', c)), [data.data]);

  const readOnly = !can('updateAbout');
  const reload = async () => {
    await data.reload();
  };

  return (
    <>
      <SectionTabHead
        actions={
          <Can action="createAboutItem">
            <button type="button" className="btn" onClick={() => go(aboutCreatePath('facts'))}>
              <Icon name="plus" />
              Add New Information Row
            </button>
            <button type="button" className="btn primary" onClick={() => go(aboutCreatePath('cards'))}>
              <Icon name="plus" />
              Add New About Card
            </button>
          </Can>
        }
      >
        The About AMRUT section of the public home page (and the profile on the About page): its heading, description, information rows and
        cards.
      </SectionTabHead>
      <LoadState loading={data.loading && !data.data} error={data.error} onRetry={() => void data.reload()} />
      {readOnly && data.data ? (
        <div className="mb14">
          <Callout tone="info" title="View only">
            Changing this section needs the About AMRUT Management update permission.
          </Callout>
        </div>
      ) : null}

      {data.data && section ? (
        <>
          <div className="card mb14">
            <div className="card-h">
              <h3>1. Section settings</h3>
              <span className="muted fs12">Last saved {fmtDateTime(section.updatedAt)}</span>
            </div>
            <div className="card-b">
              <SectionSettingsForm section={section} onSaved={setSection} readOnly={readOnly} />
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>2. About description</h3>
            </div>
            <div className="card-b">
              <DescriptionForm section={section} onSaved={setSection} readOnly={readOnly} />
            </div>
          </div>

          <ItemList kind="facts" heading="3. Organisation information" items={facts} loading={data.loading} onChanged={reload} />
          <ItemList kind="cards" heading="4. Mission, Vision and Values cards" items={cards} loading={data.loading} onChanged={reload} />
        </>
      ) : null}
    </>
  );
}
