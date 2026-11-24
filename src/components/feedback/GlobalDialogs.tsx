import { useEffect, useState } from 'react';
import AS from '../../legacy';
import { Modal } from '../ui/Overlay';
import { GenBadge, Badge, titleCase, type BiText } from '../ui';

/*
 * Dialogs that several pages open: task detail, create task, LMS sync.
 * Pages call AS.actions.openTask(id) / newTask(districtCode) / syncLms(), which this host registers, so callers
 * don't import each other.
 *
 * None of these has a live source yet: tasks lived only in the sample dataset and the "sync" only pretended to
 * contact the LMS. Each now opens an honest "not available yet" notice instead of a sample drawer, a form that
 * pretends to save, or a fake sync result.
 */
type Dialog = { type: 'task'; id: string } | { type: 'newTask'; districtCode?: string } | { type: 'sync' };

let setGlobal: (d: Dialog | null) => void = () => {};
export const openGlobalDialog = (d: Dialog) => setGlobal(d);

const NOT_AVAILABLE: Record<Dialog['type'], { title: BiText; msg: BiText }> = {
  task: {
    title: { en: 'Task details', mr: 'कार्य तपशील' },
    msg: {
      en: 'Tasks and alerts are not available yet. They appear here once the task module is connected to the server.',
      mr: 'कार्ये व सूचना अद्याप उपलब्ध नाहीत. कार्य मॉड्यूल सर्व्हरशी जोडल्यावर ती येथे दिसतील.',
    },
  },
  newTask: {
    title: { en: 'Create task', mr: 'कार्य तयार करा' },
    msg: {
      en: 'Creating tasks is not available yet. It opens once the task module is connected to the server.',
      mr: 'कार्य तयार करणे अद्याप उपलब्ध नाही. कार्य मॉड्यूल सर्व्हरशी जोडल्यावर ते सुरू होईल.',
    },
  },
  sync: {
    title: { en: 'LMS sync', mr: 'LMS समक्रमण' },
    msg: {
      en: 'A programme-wide LMS sync is not available here yet. To send a candidate to the LMS, open the candidate on the Candidates screen.',
      mr: 'संपूर्ण कार्यक्रमाचे LMS समक्रमण येथे अद्याप उपलब्ध नाही. उमेदवाराला LMS मध्ये पाठवण्यासाठी उमेदवार स्क्रीनवर तो उमेदवार उघडा.',
    },
  },
};

export default function GlobalDialogs() {
  const [dlg, setDlg] = useState<Dialog | null>(null);
  useEffect(() => {
    setGlobal = setDlg;
    AS.actions.openTask = (id) => {
      if (id) setDlg({ type: 'task', id });
    };
    AS.actions.newTask = (districtCode) => setDlg({ type: 'newTask', districtCode: districtCode ?? undefined });
    AS.actions.syncLms = () => setDlg({ type: 'sync' });
    return () => {
      setGlobal = () => {};
    };
  }, []);
  if (!dlg) return null;
  const text = NOT_AVAILABLE[dlg.type];
  const close = () => setDlg(null);
  return (
    <Modal
      title={
        <>
          {text.title.en} · <span lang="mr">{text.title.mr}</span>
        </>
      }
      onClose={close}
      footer={
        <button type="button" className="btn" onClick={close}>
          Close · <span lang="mr">बंद करा</span>
        </button>
      }
    >
      <div className="empty" data-testid="not-available">
        <p>{text.msg.en}</p>
        <p lang="mr">{text.msg.mr}</p>
      </div>
    </Modal>
  );
}

const prioTone = (p: string) => (p === 'HIGH' ? 'red' : p === 'MEDIUM' ? 'amber' : 'grey');
export const Prio = ({ p }: { p: string }) => <Badge tone={prioTone(p)}>{titleCase(p)}</Badge>;

export { GenBadge };
