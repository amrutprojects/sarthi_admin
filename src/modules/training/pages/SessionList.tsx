import { EmptyState, useGo } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import type { LiveSession } from '../../../types/domain';

/* List of training sessions (original sessionList helper in training.js). */
export default function SessionList({ sessions }: { sessions: LiveSession[] }) {
  const go = useGo();
  if (!sessions.length) return <EmptyState title="No live sessions" msg="No sessions are currently in progress in this mode." />;
  return (
    <div className="list">
      {sessions.map((s) => (
        <div key={s.id || s.batchId + s.start} className="list-row" onClick={() => go('#/batches/' + s.batchId)}>
          <div className="icon-sq" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
            <Icon name="play" />
          </div>
          <div className="lr-main">
            <b>{s.batchId}</b>
            <span>
              {s.topic} · started {s.start}
            </span>
          </div>
          <div className="tr">
            <b className="fs13">
              {s.present}/{s.expected}
            </b>
            <div className="fs11 muted">{Math.round((s.present / s.expected) * 100)}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}
