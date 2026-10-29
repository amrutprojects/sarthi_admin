import Icon from '../../../../components/ui/Icon';
import { KvList, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import { SectionTabHead } from '../../components/SectionTabs';
import { LoadState, fmtDateTime, useApiData } from '../../shared';
import { BRANDBAR_EDIT_PATH } from '../constants';
import { brandBarService } from '../services/brandBarService';
import type { Bilingual } from '../types/brandbar.types';
import BrandBarPreview from './BrandBarPreview';

/* A text that may be blank, with what the website does then. */
const Text = ({ value, lang, none }: { value: string; lang?: 'mr' | 'en'; none: string }) =>
  value ? <span lang={lang}>{value}</span> : <span className="muted">{none}</span>;

/* Marathi first, as on the public site; English underneath. */
const Pair = ({ value, none }: { value: Bilingual; none: string }) =>
  value.mr || value.en ? (
    <div>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  ) : (
    <span className="muted">{none}</span>
  );

/*
 * Brand Bar — the Brand Bar tab of Home Page Management: the white bar directly under the top bar of the public
 * website, with the AMRUT Kalash title, the academy's full name in Marathi and in English, and the implementation
 * partner at the right. One record, shown here as it reads and as the website draws it; Edit opens its form.
 */
export default function BrandBarTab() {
  const go = useGo();
  const bar = useApiData(() => brandBarService.get(), []);
  const cfg = bar.data;

  return (
    <>
      <SectionTabHead
        actions={
          <Can action="updateBrandBar">
            <button type="button" className="btn primary" disabled={!cfg} onClick={() => go(BRANDBAR_EDIT_PATH)}>
              <Icon name="edit" />
              Edit
            </button>
          </Can>
        }
      >
        The white bar under the top bar on every page of the public website: the title and the academy&rsquo;s full name on the left, and
        the implementation partner on the right.
      </SectionTabHead>

      <LoadState loading={bar.loading && !cfg} error={bar.error} onRetry={() => void bar.reload()} />

      {cfg ? (
        <>
          <div className="card mb14">
            <div className="card-h">
              <h3>Brand bar preview</h3>
              <span className="muted fs12">As the website shows it, in Marathi and in English</span>
            </div>
            <div className="card-b">
              <BrandBarPreview title={cfg.title} fullName={cfg.fullName} partnerLabel={cfg.partnerLabel} partnerName={cfg.partnerName} />
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>Brand bar</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Title', <b key="t">{cfg.title}</b>],
                  ['Full name (Marathi)', <Text key="fm" lang="mr" value={cfg.fullName.mr} none="None — the line is not shown" />],
                  ['Full name (English)', <Text key="fe" lang="en" value={cfg.fullName.en} none="None — the line is not shown" />],
                  ['Partner label', <Pair key="pl" value={cfg.partnerLabel} none="None — no label is shown" />],
                  ['Partner name', <Text key="pn" value={cfg.partnerName} none="None — the partner is not shown" />],
                  ['Last updated', fmtDateTime(cfg.updatedAt)],
                ]}
              />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
