import { useRef, useState } from 'react'
import { compressImage, needsCompression } from '../lib/imageUtils'

interface ImagePickerProps {
  onImageSelect: (file: File) => void
  disabled?: boolean
}

export function ImagePicker({ onImageSelect, disabled }: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file type - be very lenient for iOS camera files
    // iOS camera files may have empty MIME type, empty filename, or no extension
    const validMimeTypes = /^image\/(jpeg|jpg|png)/
    const fileName = (file.name || '').toLowerCase()
    const fileExt = fileName.includes('.') ? fileName.split('.').pop() || '' : ''
    const validExtensions = ['jpg', 'jpeg', 'png']
    
    // On iOS, camera files might have:
    // - Empty or missing filename
    // - Empty MIME type  
    // - No file extension
    // So we need to be very lenient - allow if:
    // 1. MIME type matches (even partially)
    // 2. Extension matches
    // 3. No filename but MIME type starts with "image/" (iOS fallback)
    // 4. No MIME type but has valid extension
    const hasValidMime = file.type && validMimeTypes.test(file.type)
    const hasValidExt = fileExt && validExtensions.includes(fileExt)
    const hasImageMime = file.type && file.type.startsWith('image/')
    const noFilename = !file.name || file.name.trim() === ''
    
    const isValidType = hasValidMime || hasValidExt || (hasImageMime && noFilename) || (noFilename && !file.type)
    
    if (!isValidType && file.size > 0) {
      // Only show error if file has content (not a cancelled selection)
      setError('Please select a JPEG or PNG image')
      return
    }

    // Validate file size (give a bit more leeway - will compress if needed)
    if (file.size > 20 * 1024 * 1024) {
      setError('Image size must be less than 20 MB')
      return
    }

    // Compress image if it's large (especially for iOS camera photos)
    try {
      let fileToUse = file
      
      console.log('File selected:', {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: file.type,
        needsCompression: needsCompression(file, 6, 2000),
      })
      
      if (needsCompression(file, 6, 2000)) {
        console.log('Starting image compression...')
        try {
          // Compress to max 1920px and 85% quality
          fileToUse = await compressImage(file, 1920, 1920, 0.85)
          console.log('Image compressed:', {
            originalSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            compressedSize: `${(fileToUse.size / (1024 * 1024)).toFixed(2)} MB`,
          })
        } catch (compressionError: any) {
          console.error('Compression error:', {
            error: compressionError,
            message: compressionError?.message,
            stack: compressionError?.stack,
            file: {
              name: file.name,
              size: file.size,
              type: file.type,
            },
          })
          // If compression fails, try with original file
          console.warn('Compression failed, using original file')
          fileToUse = file
        }
      }
      
      onImageSelect(fileToUse)
    } catch (err: any) {
      console.error('File selection error:', {
        error: err,
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
        },
      })
      setError(`Failed to process image: ${err?.message || 'Unknown error'}`)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
        aria-label="Select or capture image"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className={`
          w-full py-4 px-6 rounded-lg font-medium text-white transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${disabled 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }
        `}
      >
        {disabled ? 'Processing...' : 'Take/Upload Photo'}
      </button>
      
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

