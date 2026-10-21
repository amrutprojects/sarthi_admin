/*
 * Active / inactive switch used by every list (users, roles, permissions, masters). A switch, not a checkbox:
 * clicking it changes the record's status on the server. Read-only (no permission, protected record) it shows the
 * state but cannot be clicked.
 */
export default function StatusToggle({
  active,
  onChange,
  disabled,
  busy,
  label,
}: {
  active: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
  /* Accessible name, e.g. "Status of Pune". */
  label: string;
}) {
  const readOnly = disabled || !onChange;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={readOnly || busy}
      title={readOnly ? undefined : active ? 'Click to deactivate' : 'Click to activate'}
      onClick={() => onChange?.(!active)}
      className={`tw-inline-flex tw-items-center tw-gap-2 tw-border-0 tw-bg-transparent tw-p-0 ${
        readOnly ? 'tw-cursor-default' : 'tw-cursor-pointer'
      } ${busy ? 'tw-opacity-60' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`tw-relative tw-inline-block tw-h-5 tw-w-9 tw-shrink-0 tw-rounded-full tw-transition-colors ${
          active ? 'tw-bg-ok' : 'tw-bg-line-strong'
        } ${readOnly ? 'tw-opacity-60' : ''}`}
      >
        <span
          className={`tw-absolute tw-top-0.5 tw-h-4 tw-w-4 tw-rounded-full tw-bg-white tw-shadow-1 tw-transition-all ${
            active ? 'tw-left-[18px]' : 'tw-left-0.5'
          }`}
        />
      </span>
      <span className={`tw-text-xs tw-font-semibold ${active ? 'tw-text-ok' : 'tw-text-ink-muted'}`}>{active ? 'Active' : 'Inactive'}</span>
    </button>
  );
}
