import Icon from '../../../../components/ui/Icon';
import { ECOSYSTEM_ICONS } from '../constants';

/*
 * Picks a card icon from the fixed list the website renders. A radio group: arrow-free, each option a
 * button with its glyph and name, the chosen one marked. Only listed identifiers can be chosen, so the
 * form can never send markup or an unknown name.
 */
export default function IconPicker({ value, onChange, error }: { value: string; onChange: (id: string) => void; error?: string }) {
  return (
    <div className="fld">
      <label id="eco-icon-label">
        Icon
        <span style={{ color: 'var(--red)' }} aria-hidden="true">
          {' '}
          *
        </span>
      </label>
      <div
        role="radiogroup"
        aria-labelledby="eco-icon-label"
        aria-describedby={error ? 'eco-icon-error' : undefined}
        aria-invalid={error ? true : undefined}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 8 }}
      >
        {ECOSYSTEM_ICONS.map((icon) => {
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
        <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id="eco-icon-error" role="alert">
          {error}
        </div>
      ) : (
        <div className="hint">The glyph shown in the round tile at the top of the card.</div>
      )}
    </div>
  );
}
