interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
}

export function Toggle({ label, checked, onChange, id }: ToggleProps) {
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={toggleId}
        className="text-sm font-medium text-gray-700 cursor-pointer"
      >
        {label}
      </label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={toggleId}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked ? 'bg-blue-600' : 'bg-gray-300'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  )
}

