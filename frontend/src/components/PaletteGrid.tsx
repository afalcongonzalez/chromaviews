import { getTextColor } from '../lib/colorUtils'
import type { PaletteColor } from '../lib/api'

interface PaletteGridProps {
  palette: PaletteColor[]
  onCopy?: (hex: string) => void
}

export function PaletteGrid({ palette, onCopy }: PaletteGridProps) {
  const handleCopy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex)
      onCopy?.(hex)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {palette.map((color, index) => {
        const textColor = getTextColor(color.hex)
        return (
          <button
            key={index}
            type="button"
            onClick={() => handleCopy(color.hex)}
            className={`
              rounded-lg p-4 shadow-md transition-transform hover:scale-105
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            `}
            style={{ backgroundColor: color.hex }}
            aria-label={`Color ${color.name}, ${color.hex}, ${color.percent.toFixed(1)}%`}
          >
            <div className={`text-sm font-medium ${textColor === 'black' ? 'text-black' : 'text-white'}`}>
              <div className="font-semibold">{color.name}</div>
              <div className="mt-1 opacity-90">{color.hex}</div>
              <div className="mt-1 opacity-75">{color.percent.toFixed(1)}%</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

