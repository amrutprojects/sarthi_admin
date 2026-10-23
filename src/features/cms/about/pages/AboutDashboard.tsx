import { useEffect, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Callout, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { LoadState, fmtDateTime, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import ItemList from '../components/ItemList';
import { DescriptionForm, SectionSettingsForm } from '../components/SectionForms';
import { ABOUT_CRUMBS } from '../constants';
import { aboutService, toItem } from '../services/aboutService';
import type { ApiAboutSection } from '../types/about.types';

/*
 * About AMRUT Management — the "About AMRUT" (अमृत विषयी माहिती) section of the home page, whose
 * profile and cards the About page shows too. One page with its four areas: section settings, the
 * description, the information rows, and the Mission / Vision / Values (and any further) cards.
 */
export default function AboutDashboard() {
  usePageTitle('About AMRUT Management');
  const go = useGo();
  const can = useCan();
  const data = useApiData(() => aboutService.get(), []);
  /* The section as last saved; both inline editors update it, so each saves against the latest version. */
  const [section, setSection] = useState<ApiAboutSection | null>(null);
  useEffect(() => {
    if (data.data) setSection(data.data.section);
  }, [data.data]);

  const readOnly = !can('updateAbout');
  const reload = async () => {
    await data.reload();
  };

  return (
    <div className="page">
      <PageHead
        crumbs={[...ABOUT_CRUMBS.slice(0, 2), { l: 'About AMRUT Management' }]}
        title="About AMRUT Management"
        sub="The About AMRUT section of the public home page (and the profile on the About page): its heading, description, information rows and cards."
      />
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

          <div className="card mb14">
            <div className="card-h">
              <h3>
                3. Organisation information <span className="sub">{data.data.facts.length} rows</span>
              </h3>
              <Can action="createAboutItem">
                <button type="button" className="btn sm primary" onClick={() => go('/cms/about-amrut/facts/create')}>
                  <Icon name="plus" />
                  Add New Information Row
                </button>
              </Can>
            </div>
            <ItemList kind="facts" items={data.data.facts.map((f) => toItem('facts', f))} onChanged={reload} />
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>
                4. Mission, Vision and Values cards <span className="sub">{data.data.cards.length} cards</span>
              </h3>
              <Can action="createAboutItem">
                <button type="button" className="btn sm primary" onClick={() => go('/cms/about-amrut/cards/create')}>
                  <Icon name="plus" />
                  Add New About Card
                </button>
              </Can>
            </div>
            <ItemList kind="cards" items={data.data.cards.map((c) => toItem('cards', c))} onChanged={reload} />
          </div>
        </>
      ) : null}
    </div>
  );
}
