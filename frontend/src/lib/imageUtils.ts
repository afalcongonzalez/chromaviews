/**
 * Compress and resize image before upload
 * Especially useful for iOS camera photos which can be very large
 */
export function compressImage(file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height
          if (width > height) {
            width = Math.min(width, maxWidth)
            height = width / aspectRatio
          } else {
            height = Math.min(height, maxHeight)
            width = height * aspectRatio
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            
            // Create a new File with the compressed blob
            const compressedFile = new File(
              [blob],
              file.name || 'compressed.jpg',
              { type: 'image/jpeg', lastModified: Date.now() }
            )
            
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Check if image needs compression
 */
export function needsCompression(file: File, maxSizeMB: number = 6, maxDimension: number = 2000): boolean {
  const sizeMB = file.size / (1024 * 1024)
  
  if (sizeMB > maxSizeMB) {
    return true
  }
  
  // For very large files, compress even if under size limit
  if (sizeMB > maxSizeMB * 0.7) {
    return true
  }
  
  return false
}
