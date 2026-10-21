import { useRef, useState, type DragEvent } from 'react';
import Icon from '../../../components/ui/Icon';

export interface FileDropProps {
  file: File | null;
  /* e.g. ".csv,.xlsx" — also used to check the name of a dropped file */
  accept: string;
  prompt: string;
  hint: string;
  maxMb: number;
  onPick: (file: File | null) => void;
  onReject: (message: string) => void;
  ariaLabel: string;
}

/* Click-or-drop file picker with type and size checks (the server checks again). */
export default function FileDrop({ file, accept, prompt, hint, maxMb, onPick, onReject, ariaLabel }: FileDropProps) {
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const exts = accept
    .split(',')
    .filter((a) => a.startsWith('.'))
    .map((a) => a.toLowerCase());

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (exts.length && !exts.some((e) => f.name.toLowerCase().endsWith(e))) return onReject(`Choose a ${exts.join(' or ')} file`);
    if (f.size > maxMb * 1024 * 1024) return onReject(`The file is larger than ${maxMb} MB`);
    onPick(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files[0]);
  };

  return (
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
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') input.current?.click();
      }}
    >
      <Icon name="download" />
      {file ? (
        <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2">
          <b className="tw-break-all">{file.name}</b>
          <span className="muted">
            · {file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`}
          </span>
          <button
            type="button"
            className="btn xs"
            onClick={(e) => {
              e.stopPropagation();
              onPick(null);
              if (input.current) input.current.value = '';
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <div>
          <b>{prompt}</b>, or click to choose
        </div>
      )}
      <div className="fs11 muted">{hint}</div>
      <input ref={input} type="file" accept={accept} hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
