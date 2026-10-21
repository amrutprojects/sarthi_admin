import MasterStatusBadge from './MasterStatusBadge';

interface StatusToggleProps {
  isActive: boolean;
  /* Record name, for the accessible label: "Pune: active". */
  name: string;
  /* Whether the user may change the status; without it the read-only badge is shown (or nothing when compact). */
  canChange: boolean;
  disabled?: boolean;
  /* Switch only, no Active / Inactive text — for the Action column, next to the icon buttons. */
  compact?: boolean;
  /* Asks for confirmation and then calls the status endpoint (the listing's existing confirm dialog). */
  onToggle: () => void;
}

/*
 * Active / Inactive switch for a CMS listing, using the panel's existing .switch control (as on the Menu
 * Visibility screen). The row opens the View page on click, so the control stops the click.
 */
export default function StatusToggle({ isActive, name, canChange, disabled, compact, onToggle }: StatusToggleProps) {
  if (!canChange) return compact ? null : <MasterStatusBadge isActive={isActive} />;
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      aria-label={`${name}: ${isActive ? 'active' : 'inactive'}`}
      title={isActive ? 'Active — switch off to deactivate' : 'Inactive — switch on to activate'}
      className={'switch' + (compact ? ' sm' : '') + (isActive ? ' on' : '')}
      disabled={disabled}
      onClick={onToggle}
    />
  );
  return (
    <span className="f ac gp8" style={compact ? { minHeight: 28 } : undefined} onClick={(e) => e.stopPropagation()}>
      {toggle}
      {compact ? null : (
        <span className="fs12" style={{ fontWeight: 600, color: isActive ? 'var(--green)' : 'var(--muted)' }}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      )}
    </span>
  );
}
