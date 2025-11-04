import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaletteGrid } from './PaletteGrid'
import type { PaletteColor } from '../lib/api'

describe('PaletteGrid', () => {
  const mockPalette: PaletteColor[] = [
    {
      hex: '#FF0000',
      name: 'red',
      percent: 50.0,
      rgb: [255, 0, 0],
      lab: [53.2, 80.1, 67.2],
    },
    {
      hex: '#00FF00',
      name: 'green',
      percent: 30.0,
      rgb: [0, 255, 0],
      lab: [87.7, -86.2, 83.2],
    },
  ]

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders palette colors', () => {
    render(<PaletteGrid palette={mockPalette} />)
    
    expect(screen.getByText('red')).toBeInTheDocument()
    expect(screen.getByText('#FF0000')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument()
  })

  it('calls onCopy when color is clicked', async () => {
    const onCopy = vi.fn()
    const user = userEvent.setup()
    
    render(<PaletteGrid palette={mockPalette} onCopy={onCopy} />)
    
    const button = screen.getByText('red').closest('button')
    expect(button).toBeInTheDocument()
    
    if (button) {
      await user.click(button)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('#FF0000')
      expect(onCopy).toHaveBeenCalledWith('#FF0000')
    }
  })
})

