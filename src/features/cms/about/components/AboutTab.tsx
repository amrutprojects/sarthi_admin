import { useEffect, useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Callout, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { SectionTabHead } from '../../components/SectionTabs';
import { LoadState, fmtDateTime, useApiData } from '../../shared';
import type { SectionVisibility } from '../../visibility/visibility.types';
import { aboutCreatePath } from '../constants';
import { aboutService, toItem } from '../services/aboutService';
import type { ApiAboutSection } from '../types/about.types';
import { normPair, samePair } from '../validation/about.validation';
import ItemList from './ItemList';
import { DescriptionForm, SectionSettingsForm } from './SectionForms';

/* Whether two versions of the section have the same texts, as the server stores them; the flag aside. */
const sameTexts = (a: ApiAboutSection, b: ApiAboutSection) =>
  samePair(normPair(a.heading), normPair(b.heading)) &&
  samePair(normPair(a.subtitle), normPair(b.subtitle)) &&
  samePair(normPair(a.description, true), normPair(b.description, true));

/* The section read again after a switch (null if that read failed), for the switch result it was read for. */
interface SwitchCheck {
  switched: SectionVisibility;
  latest: ApiAboutSection | null;
}

/*
 * The section the editors save against after a switch. The switch's result has only the flag and the version, and
 * that version would also cover any save made elsewhere since this tab loaded: it is taken (as the section read
 * again) only while the texts are still what this tab saved. Otherwise the old version stays, so the next save
 * here is refused as stale instead of silently overwriting the other save.
 */
function withSwitch(
  saved: ApiAboutSection | null,
  switched: SectionVisibility | undefined,
  check: SwitchCheck | null,
): { section: ApiAboutSection | null; changedElsewhere: boolean } {
  /* Compared by time, so a load or save that lands after the switch wins in turn. */
  if (!saved || !switched?.updatedAt || Date.parse(switched.updatedAt) <= Date.parse(saved.updatedAt))
    return { section: saved, changedElsewhere: false };
  const flagged = { ...saved, showSection: switched.visible };
  /* Still being read, or the read failed: until the version is known to be safe, a save keeps the old one. */
  if (check?.switched !== switched || !check.latest) return { section: flagged, changedElsewhere: false };
  if (sameTexts(check.latest, saved)) return { section: check.latest, changedElsewhere: false };
  return { section: flagged, changedElsewhere: true };
}

/*
 * About AMRUT — the About AMRUT Management tab of Home Page Management: the "About AMRUT" (अमृत विषयी माहिती)
 * section of the home page, whose profile and cards the About page shows too. Its four areas: section settings,
 * the description, and the information rows and the Mission / Vision / Values (and any further) cards as two
 * listings like FAQ Management's.
 *
 * `switched` is the last result of the tab's "Show on website" switch (HomePageView). The switch writes the
 * section's showSection and so bumps its updatedAt; the tab is not remounted for it, which would throw away the
 * unsaved edits of its two inline editors, but reads the section again in the background and takes the newer
 * version from that (see withSwitch).
 */
export default function AboutTab({ switched }: { switched?: SectionVisibility }) {
  const go = useGo();
  const can = useCan();
  const data = useApiData(() => aboutService.get(), []);
  /* The section as last saved; both inline editors update it, so each saves against the latest version. */
  const [saved, setSection] = useState<ApiAboutSection | null>(null);
  useEffect(() => {
    if (data.data) setSection(data.data.section);
  }, [data.data]);
  /* Each switch result is checked by reading the section again; only the latest switch's read counts. */
  const [check, setCheck] = useState<SwitchCheck | null>(null);
  useEffect(() => {
    if (!switched?.updatedAt) return;
    let current = true;
    void aboutService.get().then(
      (about) => current && setCheck({ switched, latest: about.section }),
      () => current && setCheck({ switched, latest: null }),
    );
    return () => {
      current = false;
    };
  }, [switched]);
  /*
   * …or as the switch last left it, when that is newer and nothing else changed meanwhile: then the version the
   * editors send moves on (and the flag), without touching their drafts.
   */
  const { section, changedElsewhere } = useMemo(() => withSwitch(saved, switched, check), [saved, switched, check]);
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
          {changedElsewhere ? (
            <div className="mb14">
              <Callout tone="warn">This section was changed elsewhere — reload to see the latest version.</Callout>
            </div>
          ) : null}
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
