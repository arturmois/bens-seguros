import { WIDGET_DIMENSIONS } from '../lib/constants'

interface WidgetButtonProps {
  readonly onClick: () => void
  readonly color: string
}

export function WidgetButton({
  onClick,
  color,
}: WidgetButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir chat de atendimento"
      style={{
        position: 'fixed',
        bottom: `${WIDGET_DIMENSIONS.BUTTON_MARGIN}px`,
        right: `${WIDGET_DIMENSIONS.BUTTON_MARGIN}px`,
        width: `${WIDGET_DIMENSIONS.BUTTON_SIZE}px`,
        height: `${WIDGET_DIMENSIONS.BUTTON_SIZE}px`,
        borderRadius: '50%',
        backgroundColor: color,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--widget-shadow-button)',
        transition:
          'transform var(--widget-transition), box-shadow var(--widget-transition)',
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow =
          'var(--widget-shadow-button), 0 0 0 3px rgba(31, 75, 95, 0.3)'
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'var(--widget-shadow-button)'
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
    </button>
  )
}
