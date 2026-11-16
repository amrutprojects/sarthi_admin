import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import Icon from '../../../../components/ui/Icon';
import { PHOTO_ACCEPT, PHOTO_MAX_MB, checkPhoto } from '../validation/advisory.validation';

/* What the form will do with the photo on save. */
export type PhotoChoice = { kind: 'keep' } | { kind: 'new'; file: File } | { kind: 'remove' };

interface PhotoFieldProps {
  /* The saved photo (already a loadable URL), or null when the trainer has none. */
  current: string | null;
  choice: PhotoChoice;
  onChange: (choice: PhotoChoice) => void;
  error?: string;
  onError: (message: string | undefined) => void;
}

/*
 * The trainer's photo: a round preview, a file picker (click or drop), and Remove / Undo. The same control
 * as Board Members Management's.
 *
 * A chosen file is checked here by its first bytes, like the server does, and previewed from memory
 * before anything is uploaded. Nothing is sent until the form is saved, so Cancel leaves the saved
 * photo exactly as it was.
 */
export default function PhotoField({ current, choice, onChange, error, onError }: PhotoFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [broken, setBroken] = useState(false);

  const newFile = choice.kind === 'new' ? choice.file : null;
  const preview = useMemo(() => (newFile ? URL.createObjectURL(newFile) : null), [newFile]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const shown = choice.kind === 'new' ? preview : choice.kind === 'remove' ? null : current;
  useEffect(() => setBroken(false), [shown]);

  async function pick(file: File | undefined) {
    if (input.current) input.current.value = '';
    if (!file) return;
    const problem = await checkPhoto(file).catch(() => 'The photo could not be read. Choose the file again.');
    if (problem) {
      onError(problem);
      return;
    }
    onError(undefined);
    onChange({ kind: 'new', file });
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void pick(e.dataTransfer.files[0]);
  };

  return (
    <div className="fld">
      <label htmlFor="advisory-photo-input">Photo</label>
      <div className="f ac gp14 wrap">
        <div
          aria-label={shown ? 'Photo preview' : 'No photo — the website shows the person icon'}
          role="img"
          style={{
            width: 86,
            height: 86,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'grid',
            placeItems: 'center',
            flex: '0 0 86px',
            background: 'linear-gradient(160deg,#FBE3CB,#F0C9A2)',
            border: '3px solid #fff',
            boxShadow: '0 0 0 2px var(--saffron, #E8822A)',
          }}
        >
          {shown && !broken ? (
            <img src={shown} alt="" onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Icon name="users" />
          )}
        </div>

        <div className="flex1" style={{ minWidth: 220 }}>
          <div
            className="import-drop"
            data-drag={drag || undefined}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                input.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Choose a photo"
            aria-describedby={error ? 'advisory-photo-error' : undefined}
          >
            {newFile ? (
              <div>
                <b className="tw-break-all">{newFile.name}</b>
                <span className="muted"> · {Math.max(1, Math.round(newFile.size / 1024))} KB — uploaded when you save</span>
              </div>
            ) : (
              <div>
                <b>{current && choice.kind === 'keep' ? 'Drop a new photo here to replace it' : 'Drop a photo here'}</b>, or click to choose
              </div>
            )}
            <div className="fs11 muted">
              JPEG, PNG or WebP, up to {PHOTO_MAX_MB} MB. A square photo of the face fits the round frame best.
            </div>
            <input
              ref={input}
              id="advisory-photo-input"
              type="file"
              accept={PHOTO_ACCEPT}
              hidden
              onChange={(e) => void pick(e.target.files?.[0])}
            />
          </div>

          <div className="f ac gp8 wrap mt10">
            {choice.kind === 'new' ? (
              <button type="button" className="btn xs" onClick={() => onChange({ kind: 'keep' })}>
                {current ? 'Keep the current photo' : 'Clear'}
              </button>
            ) : error ? (
              /*
               * A rejected file was never taken (the choice is unchanged), but its error blocks saving. Without
               * this there would be no way out on Add trainer — no saved photo and no new file means no other
               * button — short of picking a valid photo or leaving the page.
               */
              <button type="button" className="btn xs" onClick={() => onError(undefined)}>
                {choice.kind === 'remove' ? 'Dismiss' : current ? 'Keep the current photo' : 'Continue without a photo'}
              </button>
            ) : null}
            {current && choice.kind === 'keep' ? (
              <button type="button" className="btn xs danger" onClick={() => onChange({ kind: 'remove' })}>
                Remove photo
              </button>
            ) : null}
            {choice.kind === 'remove' ? (
              <>
                <span className="fs12 muted">The photo will be removed when you save; the website will show the person icon.</span>
                <button type="button" className="btn xs" onClick={() => onChange({ kind: 'keep' })}>
                  Undo
                </button>
              </>
            ) : null}
          </div>

          {error ? (
            <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id="advisory-photo-error" role="alert">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
