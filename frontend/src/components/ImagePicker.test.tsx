import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImagePicker } from './ImagePicker'

describe('ImagePicker', () => {
  it('renders the upload button', () => {
    const onImageSelect = vi.fn()
    render(<ImagePicker onImageSelect={onImageSelect} />)
    
    expect(screen.getByText('Take/Upload Photo')).toBeInTheDocument()
  })

  it('shows disabled state', () => {
    const onImageSelect = vi.fn()
    render(<ImagePicker onImageSelect={onImageSelect} disabled />)
    
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('calls onImageSelect when file is selected', async () => {
    const onImageSelect = vi.fn()
    const user = userEvent.setup()
    
    render(<ImagePicker onImageSelect={onImageSelect} />)
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('Select or capture image') as HTMLInputElement
    
    await user.upload(input, file)
    
    expect(onImageSelect).toHaveBeenCalledWith(file)
  })
})

