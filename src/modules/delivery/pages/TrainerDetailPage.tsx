import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AS from '../../../legacy';
import {
  PageHead,
  Card,
  Kpi,
  KvList,
  LinkButton,
  EmptyState,
  DemoNote,
  GenBadge,
  ModeTag,
  Callout,
  titleCase,
  useGo,
} from '../../../components/ui';
import { HBar } from '../../../components/charts';
import Avatar from '../../../components/ui/Avatar';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/deliveryService';
import { Can } from '../../auth';

export default function TrainerDetailPage() {
  useLegacyTick();
  const go = useGo();
  const { id = '' } = useParams();
  useEffect(() => {
    document.title = 'Trainer — AMRUT × SUMAGO Admin';
  }, []);

  const t = S.trainer(id);
  if (!t)
    return (
      <div className="page">
        <EmptyState title="Trainer not found" msg="">
          <LinkButton to="#/trainers" className="btn primary">
            All trainers
          </LinkButton>
        </EmptyState>
      </div>
    );
  const centre = S.centre(t.centreId);
  const perf = [
    { l: 'Session delivery', v: Math.min(100, Math.round((t.sessionsDelivered / 100) * 100)) },
    { l: 'Batch attendance', v: t.attendance },
    { l: 'Student feedback', v: Math.round((t.feedback / 5) * 100) },
    { l: 'Assessment outcomes', v: t.score },
    { l: 'Documentation', v: t.totStatus === 'CERTIFIED' ? 92 : 70 },
  ].map((x) => ({ l: x.l, v: x.v, display: x.v + '%', c: x.v >= 80 ? '#1E7A46' : x.v >= 65 ? '#C98A1E' : '#B3271E' }));

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Trainers', link: '#/trainers' }, { l: t.name }]}
        title={t.name}
        badge={
          <>
            <ModeTag mode={t.mode} />
            <GenBadge status={t.availability} />
          </>
        }
        sub={
          <>
            <span className="mono">{t.id}</span> · {t.qualification} · {t.experience} years experience · {t.specialization}
          </>
        }
        actions={
          <>
            <LinkButton to="#/tot">ToT status</LinkButton>
            <Can action="createBatch">
              <button
                type="button"
                className="btn primary"
                onClick={() => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok')}
              >
                Allocate to batch
              </button>
            </Can>
          </>
        }
      />
      {t.availability === 'INACTIVE' ? (
        <div className="mb14">
          <Callout tone="err" title="Trainer inactive">
            {'This trainer is not currently available. Batches at ' + centre.name + ' need a replacement allocation.'}
          </Callout>
        </div>
      ) : null}
      <div className="grid g6 mb14">
        <Kpi label="Batches assigned" value={t.batches.length} tone="b" />
        <Kpi label="Students" value={t.students} tone="g" />
        <Kpi label="Sessions delivered" value={t.sessionsDelivered} tone="" />
        <Kpi label="Batch attendance" value={t.attendance + '%'} tone={t.attendance >= 75 ? 'g' : 'a'} />
        <Kpi label="Student feedback" value={t.feedback.toFixed(1) + '/5'} tone="v" />
        <Kpi
          label="Trainer score"
          value={t.score + '/100'}
          tone={t.score >= 80 ? 'g' : 'a'}
          pct={t.score}
          progTone={t.score >= 80 ? 'g' : 'a'}
        />
      </div>
      <div className="grid g-1-2 mb14">
        <Card title="Trainer profile">
          <div className="f gp10 ac mb14">
            <Avatar name={t.name} cls="lg" />
            <div>
              <b className="fs16">{t.name}</b>
              <div className="fs12 muted">{t.qualification}</div>
            </div>
          </div>
          <KvList
            pairs={[
              ['Trainer ID', t.id],
              ['Mobile', t.phone],
              ['Email', t.email],
              ['Specialization', t.specialization],
              ['Experience', t.experience + ' years'],
              ['Training mode', t.mode === 'ONLINE' ? 'Online (central)' : 'Offline (centre)'],
              ['Centre / unit', centre.name],
              ['District', S.districtName(t.districtId)],
            ]}
          />
        </Card>
        <Card title="Performance breakdown">
          <HBar items={perf} opts={{ max: 100 }} />
          <div className="sep" />
          <b className="fs12">Training of Trainers (ToT)</b>
          <div className="steps mt8">
            <div className={'step ' + (t.totDay1 ? 'done' : '')}>
              <b>Day 1</b>
              <span>{t.totDay1 ? 'Completed' : 'Pending'}</span>
            </div>
            <div className={'step ' + (t.totDay2 ? 'done' : '')}>
              <b>Day 2</b>
              <span>{t.totDay2 ? 'Completed' : 'Pending'}</span>
            </div>
            <div className={'step ' + (t.totStatus === 'CERTIFIED' ? 'done' : 'cur')}>
              <b>Certification</b>
              <span>{titleCase(t.totStatus)}</span>
            </div>
          </div>
        </Card>
      </div>
      <Card title="Assigned batches" flush>
        {t.batches.length ? (
          <div className="list">
            {t.batches.map((b) => (
              <div key={b.id} className="list-row" onClick={() => go('#/batches/' + b.id)}>
                <div className="lr-main">
                  <b className="mono">{b.id}</b>
                  <span>
                    {S.courseName(b.courseId)} · {b.students} students · attendance {b.attendance}%
                  </span>
                </div>
                <ModeTag mode={b.mode} />
                <GenBadge status={b.status} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No batches assigned" msg="This trainer is available for allocation." />
        )}
      </Card>
      <DemoNote />
    </div>
  );
}
