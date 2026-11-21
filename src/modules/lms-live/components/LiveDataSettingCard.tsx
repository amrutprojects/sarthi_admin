import { Badge, Callout, Card } from '../../../components/ui';
import { ApiError } from '../../../services/api-client';
import { useCan } from '../../auth';
import { useLiveDataState, useSetLiveData } from '../hooks/useLiveData';
import { fetchedAtLabel } from '../utils/format';
import { LIVE_DATA_TEXT } from '../utils/liveDataText';

const Both = ({ t }: { t: { en: string; mr: string } }) => (
  <>
    <div>{t.en}</div>
    <div lang="mr">{t.mr}</div>
  </>
);

/*
 * System Settings card of G-2 "Show live LMS data". The switch is disabled (with the reason) while it cannot be
 * switched on, and read-only for users without settings.update. Shown only when the server answers the state, so a
 * server without G-2 keeps the settings screen as it was.
 */
export function LiveDataSettingCard() {
  const can = useCan();
  const q = useLiveDataState();
  const set = useSetLiveData();
  if (!q.isSuccess) return null;
  const s = q.data;
  const mayEdit = can('editSettings');
  /* Switching off is always allowed; switching on only when the server says it can be. */
  const disabled = !mayEdit || set.isPending || (!s.setting && !s.canEnable);
  const error = set.error instanceof ApiError ? set.error : null;

  return (
    <div className="mb14">
      <Card title="LMS data source" sub="G-2">
        <div className="f gp8" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <label htmlFor="live-lms-data" style={{ fontWeight: 600 }}>
              <Both t={LIVE_DATA_TEXT.title} />
            </label>
            <div className="muted mt8" style={{ fontSize: 12 }}>
              <Both t={LIVE_DATA_TEXT.help} />
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 120 }}>
            <button
              id="live-lms-data"
              type="button"
              role="switch"
              aria-checked={s.setting}
              aria-label={LIVE_DATA_TEXT.title.en}
              className={'switch' + (s.setting ? ' on' : '')}
              disabled={disabled}
              onClick={() => set.mutate(!s.setting)}
            />
            <div className="mt8">
              <Badge tone={s.live ? 'green' : 'grey'}>{s.live ? 'Live from LMS' : 'Local data'}</Badge>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {s.setting ? `${LIVE_DATA_TEXT.on.en} / ${LIVE_DATA_TEXT.on.mr}` : `${LIVE_DATA_TEXT.off.en} / ${LIVE_DATA_TEXT.off.mr}`}
            </div>
          </div>
        </div>
        {s.blocker ? (
          <div className="mt10" data-testid="live-data-blocker">
            <Callout tone="warn">
              <Both t={LIVE_DATA_TEXT.blocker[s.blocker]} />
              {s.missing.length ? <div className="muted mt8">Missing: {s.missing.join(', ')}</div> : null}
            </Callout>
          </div>
        ) : null}
        {error ? (
          <div className="mt10" role="alert">
            <Callout tone="err" title="Not saved">
              {error.message}
            </Callout>
          </div>
        ) : null}
        {s.updatedAt ? (
          <div className="muted mt8" style={{ fontSize: 12 }}>
            Last changed {fetchedAtLabel(s.updatedAt)} (recorded in the audit log).
          </div>
        ) : null}
      </Card>
    </div>
  );
}
