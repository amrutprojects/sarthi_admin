import Icon from '../../../../components/ui/Icon';
import { ECOSYSTEM_ICONS } from '../constants';

/*
 * Picks a card icon from the fixed list the website renders. A radio group: arrow-free, each option a
 * button with its glyph and name, the chosen one marked. Only listed identifiers can be chosen, so the
 * form can never send markup or an unknown name.
 *
 * The list, the ids and the hint default to The AMRUT Ecosystem's cards; another section passes its own
 * (Quick Actions: its tiles' icons).
 */
export default function IconPicker({
  value,
  onChange,
  error,
  icons = ECOSYSTEM_ICONS,
  id = 'eco-icon',
  hint = 'The glyph shown in the round tile at the top of the card.',
}: {
  value: string;
  onChange: (id: string) => void;
  error?: string;
  /* The icons that may be chosen, in the order offered, each with the name shown under its glyph. */
  icons?: readonly { id: string; label: string }[];
  /* Base id of the label and error line. */
  id?: string;
  hint?: string;
}) {
  return (
    <div className="fld">
      <label id={`${id}-label`}>
        Icon
        <span style={{ color: 'var(--red)' }} aria-hidden="true">
          {' '}
          *
        </span>
      </label>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 8 }}
      >
        {icons.map((icon) => {
          const on = icon.id === value;
          return (
            <button
              key={icon.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={icon.label}
              title={`${icon.label} (${icon.id})`}
              onClick={() => onChange(icon.id)}
              className="btn"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 6px',
                height: 'auto',
                whiteSpace: 'normal',
                borderColor: on ? 'var(--brand-600)' : undefined,
                background: on ? 'var(--saffron-100)' : undefined,
                color: on ? 'var(--brand-600)' : undefined,
                fontWeight: on ? 700 : undefined,
              }}
            >
              <Icon name={icon.id} />
              <span className="fs11">{icon.label}</span>
            </button>
          );
        })}
      </div>
      {error ? (
        <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={`${id}-error`} role="alert">
          {error}
        </div>
      ) : (
        <div className="hint">{hint}</div>
      )}
    </div>
  );
}
