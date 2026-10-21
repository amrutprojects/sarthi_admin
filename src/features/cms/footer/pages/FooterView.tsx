import { Callout, Dash, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { footerService } from '../services/footerService';
import { LINK_KIND_LABEL, type ApiFooterLink, type Bilingual } from '../types/footer.types';

/*
 * Footer Management — the read-only view of what the public footer is showing.
 *
 * This is the landing screen for the menu because cms-footer.view and cms-footer.update are
 * separate permissions: a view-only administrator gets the whole picture without an editable form,
 * and the Edit button simply is not rendered for them.
 */
export default function FooterView() {
  usePageTitle('Footer');
  const go = useGo();
  const detail = useApiData(() => footerService.get(), []);
  const { busy, run } = useAction();

  const footer = detail.data;

  /* Marathi first, as on the public site; English underneath so both are checkable at a glance. */
  const pair = (value: Bilingual | null | undefined) =>
    value ? (
      <div>
        <div lang="mr">{value.mr}</div>
        <div className="muted fs12" lang="en">
          {value.en}
        </div>
      </div>
    ) : (
      <Dash />
    );

  const linkList = (links: ApiFooterLink[]) =>
    links.length === 0 ? (
      <p className="muted fs12">No lines.</p>
    ) : (
      <ul className="plain">
        {links.map((l) => (
          <li key={l.id} className="f ac gp8 wrap mb8">
            <span className="flex1">{pair(l.label)}</span>
            <span className="muted fs12">{LINK_KIND_LABEL[l.kind]}</span>
            {l.href ? <code className="fs12">{l.href}</code> : null}
            <MasterStatusBadge isActive={l.isActive} />
          </li>
        ))}
      </ul>
    );

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Footer' }]}
        title="Footer Management"
        sub="The text, links and bottom bar shown in the footer of every public page."
        actions={
          footer ? (
            <div className="f ac gp8 wrap">
              <Can action="updateFooter">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => footerService.setPublished(!footer.isPublished),
                      footer.isPublished ? 'Footer unpublished' : 'Footer published',
                      () => detail.reload(),
                    )
                  }
                >
                  {footer.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </Can>
              <Can action="updateFooter">
                <button type="button" className="btn primary" onClick={() => go('/cms/footer/edit')}>
                  <Icon name="doc" />
                  Edit content
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {footer ? (
        <>
          {!footer.isPublished ? (
            <div className="mb14">
              <Callout tone="warn" title="This content is not published">
                The public site is showing the website&rsquo;s own built-in footer. Publish to make
                the content below live.
              </Callout>
            </div>
          ) : null}

          <div className="card mb14">
            <div className="card-h">
              <h3>About column</h3>
              <MasterStatusBadge isActive={footer.isPublished} />
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Heading', pair(footer.about.heading)],
                  ['About text', pair(footer.about.body)],
                  ['Partner label', pair(footer.about.partnerLabel)],
                  ['Partner name', footer.about.partnerName],
                  ['Last updated', fmtDateTime(footer.updatedAt)],
                ]}
              />
            </div>
          </div>

          {footer.linkColumns.map((column, index) => (
            <div className="card mb14" key={column.id}>
              <div className="card-h">
                <h3>Link column {index + 1}</h3>
                <MasterStatusBadge isActive={column.isActive} />
              </div>
              <div className="card-b">
                <KvList pairs={[['Heading', pair(column.heading)]]} />
                <div className="mt10">{linkList(column.links)}</div>
              </div>
            </div>
          ))}

          <div className="card mb14">
            <div className="card-h">
              <h3>Contact column</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Heading', pair(footer.contact.heading)],
                  ['Address', pair(footer.contact.address)],
                  ['Email', footer.contact.email],
                  ['Phone', footer.contact.phone],
                ]}
              />
              <h4 className="fs14 mt14 mb10">Extra lines</h4>
              {linkList(footer.contact.links)}
            </div>
          </div>

          <div className="card mb14">
            <div className="card-h">
              <h3>Bottom bar</h3>
            </div>
            <div className="card-b">
              <KvList
                pairs={[
                  ['Copyright', pair(footer.bottom.copyright)],
                  ['Disclaimer', pair(footer.bottom.disclaimer)],
                ]}
              />
              <p className="muted fs12 mt10">
                <code>{'{year}'}</code> in the copyright line is replaced with the current year when
                the page is shown.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
