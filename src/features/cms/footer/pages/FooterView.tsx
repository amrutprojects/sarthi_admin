import { Callout, Dash, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can } from '../../../../modules/auth/components/Can';
import Icon from '../../../../components/ui/Icon';
import FieldTable, { Bi, FieldValue } from '../../components/FieldTable';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionNote, SectionTabBar, SectionTabPanel } from '../../components/SectionTabs';
import { LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { useSectionTab } from '../../useSectionTab';
import { footerService } from '../services/footerService';
import { FOOTER_TABS, LINK_KIND_LABEL, type ApiFooter, type ApiFooterLink } from '../types/footer.types';

/* The lines of a link column or of the contact column, in website order: what each says, how it behaves and where it leads. */
function LinksTable({ links }: { links: ApiFooterLink[] }) {
  if (links.length === 0) {
    return (
      <div className="card-b">
        <p className="muted fs12">No lines.</p>
      </div>
    );
  }
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th scope="col" style={{ width: '76px' }}>
              Sr. No.
            </th>
            <th scope="col">Line</th>
            <th scope="col">Type</th>
            <th scope="col">Link</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l, i) => (
            <tr className="norow" key={l.id}>
              <td>
                <span className="t2">{i + 1}</span>
              </td>
              {/*
               * Panel cells never wrap (styles.css: table.tbl td { white-space: nowrap }); a line's text and its link may.
               * The inner blocks keep a minimum width (min-width on a td is unreliable), so on a phone the table scrolls
               * sideways, as the Modules tables do, instead of squeezing these two columns to a few characters.
               */}
              <td style={{ whiteSpace: 'normal' }}>
                <div style={{ minWidth: '9rem' }}>
                  <Bi value={l.label} />
                </div>
              </td>
              <td>{LINK_KIND_LABEL[l.kind]}</td>
              <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                {l.href ? (
                  <code className="fs12" style={{ display: 'block', minWidth: '10rem' }}>
                    {l.href}
                  </code>
                ) : (
                  <Dash />
                )}
              </td>
              <td>
                <MasterStatusBadge isActive={l.isActive} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* About column tab: the footer's first column. */
function AboutTab({ footer }: { footer: ApiFooter }) {
  return (
    <>
      <SectionNote>
        Marathi is shown first, English underneath. The partner name is the same in both languages, so it shows once.
      </SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>
            About column <span className="sub">the first column of the public footer</span>
          </h3>
          <MasterStatusBadge isActive={footer.isPublished} />
        </div>
        <FieldTable
          rows={[
            ['Heading', <Bi value={footer.about.heading} />],
            ['About text', <Bi value={footer.about.body} />],
            ['Partner label', <Bi value={footer.about.partnerLabel} />],
            ['Partner name', <FieldValue value={footer.about.partnerName} />],
          ]}
        />
      </div>
    </>
  );
}

/* Link columns tab: each link column, its heading and its lines. */
function LinkColumnsTab({ footer }: { footer: ApiFooter }) {
  return (
    <>
      <SectionNote>
        Each link column&rsquo;s heading and lines, in the order the public footer shows them. Marathi first, English underneath.
      </SectionNote>
      {footer.linkColumns.length === 0 ? (
        <div className="card">
          <div className="card-b">
            <div className="hint">No link columns are configured.</div>
          </div>
        </div>
      ) : (
        footer.linkColumns.map((column, index) => (
          <div className="card mb14" key={column.id}>
            <div className="card-h">
              <h3>Link column {index + 1}</h3>
              <MasterStatusBadge isActive={column.isActive} />
            </div>
            <div className="card-b">
              <KvList pairs={[['Heading', <Bi value={column.heading} />]]} />
            </div>
            <LinksTable links={column.links} />
          </div>
        ))
      )}
    </>
  );
}

/* Contact column tab: the footer's last column and its extra lines. */
function ContactColumnTab({ footer }: { footer: ApiFooter }) {
  return (
    <>
      <SectionNote>
        Marathi is shown first, English underneath. Email and phone are the same in both languages, so they show once.
      </SectionNote>
      <div className="card mb14">
        <div className="card-h">
          <h3>
            Contact column <span className="sub">the last column of the public footer</span>
          </h3>
        </div>
        <FieldTable
          rows={[
            ['Heading', <Bi value={footer.contact.heading} />],
            ['Address', <Bi value={footer.contact.address} />],
            ['Email', <FieldValue value={footer.contact.email} />],
            ['Phone', <FieldValue value={footer.contact.phone} />],
          ]}
        />
      </div>
      <div className="card">
        <div className="card-h">
          <h3>
            Extra lines <span className="sub">the contact column&rsquo;s further lines</span>
          </h3>
        </div>
        <LinksTable links={footer.contact.links} />
      </div>
    </>
  );
}

/* Bottom bar tab: the copyright and disclaimer lines. */
function BottomBarTab({ footer }: { footer: ApiFooter }) {
  return (
    <>
      <SectionNote>
        <code>{'{year}'}</code> in the copyright line is replaced with the current year when the page is shown.
      </SectionNote>
      <div className="card">
        <div className="card-h">
          <h3>Bottom bar</h3>
        </div>
        <FieldTable
          rows={[
            ['Copyright', <Bi value={footer.bottom.copyright} />],
            ['Disclaimer', <Bi value={footer.bottom.disclaimer} />],
          ]}
        />
      </div>
    </>
  );
}

/*
 * Footer Management — the read-only view of what the public footer is showing.
 *
 * This is the landing screen for the menu because cms-footer.view and cms-footer.update are
 * separate permissions: a view-only administrator gets the whole picture without an editable form,
 * and the Edit button simply is not rendered for them. The footer is shown one part per tab, with the
 * same tab strip as Modules Page Management, and the tab kept in the URL (?tab=).
 */
export default function FooterView() {
  usePageTitle('Footer');
  const go = useGo();
  const detail = useApiData(() => footerService.get(), []);
  const { busy, run } = useAction();
  const [tab, selectTab] = useSectionTab(FOOTER_TABS);

  const footer = detail.data;

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
                  <Icon name="globe" />
                  {footer.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </Can>
              <Can action="updateFooter">
                <button type="button" className="btn primary" onClick={() => go('/cms/footer/edit')}>
                  <Icon name="edit" />
                  Edit content
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />

      {/* Larger, higher-contrast table text than the panel defaults: see .cms-sections in cms-tables.css. */}
      {footer ? (
        <div className="cms-sections">
          {!footer.isPublished ? (
            <div className="mb14">
              <Callout tone="warn" title="This content is not published">
                The public site is showing the website&rsquo;s own built-in footer. Publish to make the content below live.
              </Callout>
            </div>
          ) : null}

          <SectionTabBar tabs={FOOTER_TABS} active={tab} onChange={selectTab} idPrefix="footer" label="Footer sections" />

          <SectionTabPanel tab="about" active={tab} idPrefix="footer">
            <AboutTab footer={footer} />
          </SectionTabPanel>
          <SectionTabPanel tab="links" active={tab} idPrefix="footer">
            <LinkColumnsTab footer={footer} />
          </SectionTabPanel>
          <SectionTabPanel tab="contact" active={tab} idPrefix="footer">
            <ContactColumnTab footer={footer} />
          </SectionTabPanel>
          <SectionTabPanel tab="bottom" active={tab} idPrefix="footer">
            <BottomBarTab footer={footer} />
          </SectionTabPanel>
          {/* One save updates the whole footer, so the time is shown on every tab. */}
          <div className="fs13 t2 mt10">Last updated {fmtDateTime(footer.updatedAt)}.</div>
        </div>
      ) : null}
    </div>
  );
}
