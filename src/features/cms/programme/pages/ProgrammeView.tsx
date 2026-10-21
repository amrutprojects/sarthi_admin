import { Callout, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { programmeService } from '../services/programmeService';
import type { Bilingual } from '../types/programme.types';

/* Marathi first, as on the public site; English underneath so both are checkable at a glance. */
function Pair({ value }: { value: Bilingual }) {
  return (
    <div>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  );
}

/*
 * Programme Page Management — the read-only view of what the public /programme page shows: introduction, objectives,
 * learning methodology, assessment criteria and certification. View-only administrators get the whole picture; the
 * Edit and Publish buttons render only for cms-programme.update.
 */
export default function ProgrammeView() {
  usePageTitle('Programme Page');
  const go = useGo();
  const detail = useApiData(() => programmeService.get(), []);
  const { busy, run } = useAction();
  const page = detail.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Programme Page' }]}
        title="Programme Page Management"
        sub="The content of the public Programme page, in Marathi and English."
        actions={
          page ? (
            <div className="f ac gp8 wrap">
              <Can action="updateProgrammePage">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => programmeService.setPublished(!page.isPublished),
                      page.isPublished ? 'Programme page unpublished' : 'Programme page published',
                      () => detail.reload(),
                    )
                  }
                >
                  {page.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </Can>
              <Can action="updateProgrammePage">
                <button type="button" className="btn primary" onClick={() => go('/cms/programme/edit')}>
                  <Icon name="doc" />
                  Edit content
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {page ? (
        <>
          {!page.isPublished ? (
            <div className="mb14">
              <Callout tone="warn" title="This content is not published">
                The public Programme page is showing the website&rsquo;s own built-in copy. Publish to make the content below live.
              </Callout>
            </div>
          ) : null}

          <div className="card mb14">
            <div className="card-h">
              <h3>About the programme</h3>
              <MasterStatusBadge isActive={page.isPublished} />
            </div>
            <div className="card-b">
              <Pair value={page.intro} />
              <ol className="mt14" style={{ paddingLeft: 20 }}>
                {page.objectives.map((o, i) => (
                  <li key={i} className="mb10">
                    <Pair value={o} />
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>Learning methodology</h3>
            </div>
            <div className="dt">
              <div className="tbl-wrap">
                <table className="tbl">
                  <tbody>
                    {page.methodology.map((m, i) => (
                      <tr key={i}>
                        <td style={{ width: '28%' }}>
                          <Pair value={m.label} />
                        </td>
                        <td>
                          <Pair value={m.value} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>Assessment &amp; passing criteria</h3>
            </div>
            <div className="dt">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th scope="col">Component</th>
                      <th scope="col">Minimum</th>
                      <th scope="col">Out of</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.assessment.map((a, i) => (
                      <tr key={i}>
                        <td>
                          <Pair value={a.component} />
                        </td>
                        <td className="mono">{a.min}</td>
                        <td className="mono">{a.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-b">
              <Pair value={page.assessmentNote} />
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>Certification</h3>
            </div>
            <div className="card-b">
              <ol style={{ paddingLeft: 20 }}>
                {page.certification.map((c, i) => (
                  <li key={i} className="mb10">
                    <Pair value={c} />
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>Training modes</h3>
            </div>
            <div className="card-b">
              <div className="mb10">
                <b>
                  <Pair value={page.trainingModes.title} />
                </b>
              </div>
              {page.trainingModes.modes.map((m, i) => (
                <div key={i} className="mb10">
                  <span className="tag">{m.name.en}</span>
                  <Pair value={m.description} />
                </div>
              ))}
              <Pair value={page.trainingModes.note} />
              <div className="muted fs12 mt14">Last updated {fmtDateTime(page.updatedAt)}</div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
