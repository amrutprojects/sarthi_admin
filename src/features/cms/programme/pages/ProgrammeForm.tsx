import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import { toastError } from '../../shared';
import BilingualField from '../../components/BilingualField';
import MasterField from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import type {
  ApiProgrammePage,
  AssessmentRow,
  Bilingual,
  MethodologyRow,
  TrainingMode,
  UpdateProgrammePageInput,
} from '../types/programme.types';

const FORM_ID = 'programme-form';
const blank = (): Bilingual => ({ mr: '', en: '' });
type Errors = Record<string, string>;

/* Client checks mirroring the backend (programme.validator.ts); the server validates again and its errors map here. */
function validate(v: UpdateProgrammePageInput): Errors {
  const e: Errors = {};
  const pair = (path: string, p: Bilingual, label: string) => {
    if (!p.mr.trim()) e[`${path}.mr`] = `${label} (Marathi) is required`;
    if (!p.en.trim()) e[`${path}.en`] = `${label} (English) is required`;
  };
  pair('intro', v.intro, 'Introduction');
  v.objectives.forEach((o, i) => pair(`objectives.${i}`, o, 'Objective'));
  if (!v.objectives.length) e.objectives = 'Add at least one objective';
  v.methodology.forEach((m, i) => {
    pair(`methodology.${i}.label`, m.label, 'Label');
    pair(`methodology.${i}.value`, m.value, 'Description');
  });
  if (!v.methodology.length) e.methodology = 'Add at least one methodology row';
  v.assessment.forEach((a, i) => {
    pair(`assessment.${i}.component`, a.component, 'Component');
    if (!Number.isInteger(a.max) || a.max < 1) e[`assessment.${i}.max`] = 'Total must be a whole number of at least 1';
    if (!Number.isInteger(a.min) || a.min < 0) e[`assessment.${i}.min`] = 'Minimum must be a whole number';
    else if (a.min > a.max) e[`assessment.${i}.min`] = 'Minimum cannot be more than the total';
  });
  if (!v.assessment.length) e.assessment = 'Add at least one assessment row';
  pair('assessmentNote', v.assessmentNote, 'Assessment note');
  v.certification.forEach((c, i) => pair(`certification.${i}`, c, 'Certification point'));
  if (!v.certification.length) e.certification = 'Add at least one certification point';
  pair('trainingModes.title', v.trainingModes.title, 'Heading');
  v.trainingModes.modes.forEach((m, i) => {
    pair(`trainingModes.modes.${i}.name`, m.name, 'Mode name');
    pair(`trainingModes.modes.${i}.description`, m.description, 'Mode description');
  });
  if (!v.trainingModes.modes.length) e['trainingModes.modes'] = 'Add at least one training mode';
  pair('trainingModes.note', v.trainingModes.note, 'Note');
  return e;
}

/* A section with Add / Remove / Move controls for its rows. */
function ListSection<T>({
  title,
  hint,
  items,
  error,
  addLabel,
  make,
  onChange,
  render,
}: {
  title: string;
  hint?: string;
  items: T[];
  error?: string;
  addLabel: string;
  make: () => T;
  onChange: (next: T[]) => void;
  render: (item: T, i: number, update: (next: T) => void) => ReactNode;
}) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>{title}</h3>
        <button type="button" className="btn sm" onClick={() => onChange([...items, make()])}>
          + {addLabel}
        </button>
      </div>
      <div className="card-b">
        {hint ? <p className="muted fs12 mb10">{hint}</p> : null}
        {error ? (
          <p className="tw-text-xs tw-text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {items.map((item, i) => (
          <div key={i} className="mb14" style={{ borderBottom: '1px dashed var(--line, #e5ddd2)', paddingBottom: 12 }}>
            <div className="f ac jb mb10">
              <b className="fs12">
                {title} {i + 1}
              </b>
              <div className="f gp8">
                <button
                  type="button"
                  className="btn xs"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Move ${title} ${i + 1} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn xs"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Move ${title} ${i + 1} down`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn xs tw-text-danger"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  aria-label={`Remove ${title} ${i + 1}`}
                >
                  Remove
                </button>
              </div>
            </div>
            {render(item, i, (next) => onChange(items.map((x, j) => (j === i ? next : x))))}
          </div>
        ))}
      </div>
    </div>
  );
}

/*
 * The whole Programme page in one form: introduction, objectives, methodology rows, the assessment table and note,
 * and the certification points. Every text is a Marathi / English pair; lists can be added to, removed from and
 * reordered (the order is the order shown on the website).
 */
export default function ProgrammeForm({
  initial,
  backTo,
  onSave,
}: {
  initial: ApiProgrammePage;
  backTo: string;
  onSave: (values: UpdateProgrammePageInput) => Promise<void>;
}) {
  const start = useMemo<UpdateProgrammePageInput>(
    () => ({
      intro: initial.intro,
      objectives: initial.objectives,
      methodology: initial.methodology,
      assessment: initial.assessment,
      assessmentNote: initial.assessmentNote,
      certification: initial.certification,
      trainingModes: initial.trainingModes,
      isPublished: initial.isPublished,
    }),
    [initial],
  );
  const [v, setV] = useState<UpdateProgrammePageInput>(start);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(start);
  const set = <K extends keyof UpdateProgrammePageInput>(k: K, next: UpdateProgrammePageInput[K]) => setV((s) => ({ ...s, [k]: next }));
  const pairErrors = (path: string) => ({ errorMr: errors[`${path}.mr`], errorEn: errors[`${path}.en`] });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length) {
      document.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setBusy(true);
    try {
      await onSave(v);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped: Errors = {};
        for (const d of err.details) if (d.field) mapped[d.field.replace(/^body\./, '')] = d.message;
        setErrors(mapped);
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <form id={FORM_ID} onSubmit={(e) => void submit(e)} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>About the programme — introduction</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="pf-intro"
              label="Introduction"
              multiline
              maxLength={500}
              value={v.intro}
              onChange={(n) => set('intro', n)}
              {...pairErrors('intro')}
            />
          </div>
        </div>

        <ListSection<Bilingual>
          title="Objective"
          hint="The bullet list under 'About the programme'."
          items={v.objectives}
          error={errors.objectives}
          addLabel="Add objective"
          make={blank}
          onChange={(n) => set('objectives', n)}
          render={(o, i, update) => (
            <BilingualField
              id={`pf-obj-${i}`}
              label="Objective"
              maxLength={300}
              value={o}
              onChange={update}
              {...pairErrors(`objectives.${i}`)}
            />
          )}
        />

        <ListSection<MethodologyRow>
          title="Methodology row"
          hint="Learning methodology: a label (e.g. Delivery mode) and its description."
          items={v.methodology}
          error={errors.methodology}
          addLabel="Add row"
          make={() => ({ label: blank(), value: blank() })}
          onChange={(n) => set('methodology', n)}
          render={(m, i, update) => (
            <>
              <BilingualField
                id={`pf-met-l-${i}`}
                label="Label"
                maxLength={80}
                value={m.label}
                onChange={(label) => update({ ...m, label })}
                {...pairErrors(`methodology.${i}.label`)}
              />
              <BilingualField
                id={`pf-met-v-${i}`}
                label="Description"
                multiline
                maxLength={300}
                value={m.value}
                onChange={(value) => update({ ...m, value })}
                {...pairErrors(`methodology.${i}.value`)}
              />
            </>
          )}
        />

        <ListSection<AssessmentRow>
          title="Assessment row"
          hint="Assessment & passing criteria table: component, minimum marks and out of."
          items={v.assessment}
          error={errors.assessment}
          addLabel="Add row"
          make={() => ({ component: blank(), min: 0, max: 0 })}
          onChange={(n) => set('assessment', n)}
          render={(a, i, update) => (
            <>
              <BilingualField
                id={`pf-ass-${i}`}
                label="Component"
                maxLength={150}
                value={a.component}
                onChange={(component) => update({ ...a, component })}
                {...pairErrors(`assessment.${i}.component`)}
              />
              <div className="grid g2">
                <MasterField id={`pf-ass-min-${i}`} label="Minimum" required error={errors[`assessment.${i}.min`]}>
                  <input
                    id={`pf-ass-min-${i}`}
                    className="inp mono"
                    type="number"
                    min={0}
                    value={a.min}
                    onChange={(e) => update({ ...a, min: Number(e.target.value) })}
                  />
                </MasterField>
                <MasterField id={`pf-ass-max-${i}`} label="Out of" required error={errors[`assessment.${i}.max`]}>
                  <input
                    id={`pf-ass-max-${i}`}
                    className="inp mono"
                    type="number"
                    min={1}
                    value={a.max}
                    onChange={(e) => update({ ...a, max: Number(e.target.value) })}
                  />
                </MasterField>
              </div>
            </>
          )}
        />

        <div className="card mb14">
          <div className="card-h">
            <h3>Assessment note</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="pf-note"
              label="Note under the table"
              multiline
              maxLength={500}
              value={v.assessmentNote}
              onChange={(n) => set('assessmentNote', n)}
              {...pairErrors('assessmentNote')}
            />
          </div>
        </div>

        <ListSection<Bilingual>
          title="Certification point"
          items={v.certification}
          error={errors.certification}
          addLabel="Add point"
          make={blank}
          onChange={(n) => set('certification', n)}
          render={(c, i, update) => (
            <BilingualField
              id={`pf-cert-${i}`}
              label="Certification point"
              multiline
              maxLength={300}
              value={c}
              onChange={update}
              {...pairErrors(`certification.${i}`)}
            />
          )}
        />

        <div className="card mb14">
          <div className="card-h">
            <h3>Training modes box</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="pf-tm-title"
              label="Heading"
              maxLength={150}
              value={v.trainingModes.title}
              onChange={(title) => set('trainingModes', { ...v.trainingModes, title })}
              {...pairErrors('trainingModes.title')}
            />
          </div>
        </div>

        <ListSection<TrainingMode>
          title="Training mode"
          hint="Each mode shows as a tag (e.g. OFFLINE / ONLINE) with its description underneath."
          items={v.trainingModes.modes}
          error={errors['trainingModes.modes']}
          addLabel="Add mode"
          make={() => ({ name: blank(), description: blank() })}
          onChange={(modes) => set('trainingModes', { ...v.trainingModes, modes })}
          render={(m, i, update) => (
            <>
              <BilingualField
                id={`pf-tm-n-${i}`}
                label="Mode name"
                maxLength={60}
                value={m.name}
                onChange={(name) => update({ ...m, name })}
                {...pairErrors(`trainingModes.modes.${i}.name`)}
              />
              <BilingualField
                id={`pf-tm-d-${i}`}
                label="Description"
                multiline
                maxLength={500}
                value={m.description}
                onChange={(description) => update({ ...m, description })}
                {...pairErrors(`trainingModes.modes.${i}.description`)}
              />
            </>
          )}
        />

        <div className="card mb14">
          <div className="card-h">
            <h3>Training modes note</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="pf-tm-note"
              label="Note under the modes"
              multiline
              maxLength={500}
              value={v.trainingModes.note}
              onChange={(note) => set('trainingModes', { ...v.trainingModes, note })}
              {...pairErrors('trainingModes.note')}
            />
          </div>
        </div>

        <label className="f ac gp8 mb14">
          <input type="checkbox" checked={!!v.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
          Published — while unpublished, the website shows its built-in Programme page.
        </label>
      </form>
      <MasterFormActions formId={FORM_ID} submitLabel="Save Programme page" busy={busy} dirty={dirty} backTo={backTo} />
    </>
  );
}
