import { useEffect, useRef, useState } from 'react'
import { getTextColor, rgbToHex } from '../lib/colorUtils'
import { getColorName, type SamplePoint } from '../lib/api'

interface ImageWithLabelsProps {
  imageUrl: string
  samples: SamplePoint[]
  showLabels: boolean
  onTap?: (x: number, y: number, hex: string) => void
  width?: number
  height?: number
}

export function ImageWithLabels({
  imageUrl,
  samples,
  showLabels,
  onTap,
  width,
  height,
}: ImageWithLabelsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })

  // Use analyzed dimensions from API response
  // These represent the dimensions of the image that was analyzed (may be resized)
  // We'll use naturalSize as fallback once the image loads
  const analyzedWidth = width || 0
  const analyzedHeight = height || 0

  // Update display size when image loads
  useEffect(() => {
    const img = imageRef.current
    if (!img) return

    const handleLoad = () => {
      const naturalWidth = img.naturalWidth
      const naturalHeight = img.naturalHeight
      setNaturalSize({ width: naturalWidth, height: naturalHeight })
      
      // Calculate display size based on container and image aspect ratio
      const container = containerRef.current
      if (container) {
        const containerWidth = container.clientWidth
        const aspectRatio = naturalWidth / naturalHeight
        const displayWidth = Math.min(containerWidth, naturalWidth)
        const displayHeight = displayWidth / aspectRatio
        setDisplaySize({ width: displayWidth, height: displayHeight })
      }
    }

    img.addEventListener('load', handleLoad)
    if (img.complete) handleLoad()

    return () => {
      img.removeEventListener('load', handleLoad)
    }
  }, [imageUrl])

  // Draw labels on canvas
  useEffect(() => {
    if (!showLabels || !canvasRef.current || !displaySize.width || !naturalSize.width) return                                                                     

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = displaySize.width
    canvas.height = displaySize.height

    // Use analyzed dimensions if provided, otherwise assume natural size was analyzed
    const effectiveAnalyzedWidth = analyzedWidth || naturalSize.width
    const effectiveAnalyzedHeight = analyzedHeight || naturalSize.height

    // Map sample coordinates from analyzed image space to displayed image space
    // Step 1: Scale from analyzed dimensions to original natural dimensions (if image was resized)
    // Step 2: Scale from natural dimensions to displayed dimensions
    const naturalScaleX = naturalSize.width / effectiveAnalyzedWidth
    const naturalScaleY = naturalSize.height / effectiveAnalyzedHeight
    const displayScaleX = displaySize.width / naturalSize.width
    const displayScaleY = displaySize.height / naturalSize.height
    
    // Combined scale: analyzed -> displayed
    const scaleX = naturalScaleX * displayScaleX
    const scaleY = naturalScaleY * displayScaleY

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw each sample point
    samples.forEach((sample) => {
      // Sample coordinates are in the analyzed image coordinate system
      // Map them to displayed coordinates
      const x = sample.x * scaleX
      const y = sample.y * scaleY

      // Draw circle
      ctx.fillStyle = sample.hex
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, 2 * Math.PI)
      ctx.fill()

      // Draw text
      const textColor = getTextColor(sample.hex)
      ctx.fillStyle = textColor
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Draw background for text
      const text = sample.name
      const metrics = ctx.measureText(text)
      const textWidth = metrics.width
      const textHeight = 16
      const padding = 4
      
      ctx.fillStyle = sample.hex
      ctx.fillRect(
        x - textWidth / 2 - padding,
        y - 20 - textHeight / 2,
        textWidth + padding * 2,
        textHeight
      )
      
      ctx.fillStyle = textColor
      ctx.fillText(text, x, y - 20)
    })
  }, [showLabels, samples, displaySize, naturalSize, width, height])

  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!onTap || !imageRef.current || !containerRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Get pixel color from displayed image
    const canvas = document.createElement('canvas')
    canvas.width = imageRef.current.naturalWidth
    canvas.height = imageRef.current.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(imageRef.current, 0, 0)
    
    // Calculate coordinates in natural image space
    const scaleX = imageRef.current.naturalWidth / rect.width
    const scaleY = imageRef.current.naturalHeight / rect.height
    const naturalX = Math.round(x * scaleX)
    const naturalY = Math.round(y * scaleY)

    const imageData = ctx.getImageData(naturalX, naturalY, 1, 1)
    const [r, g, b] = imageData.data
    const hex = rgbToHex(r, g, b)

    onTap(naturalX, naturalY, hex)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Analyzed image"
        className="w-full h-auto rounded-lg shadow-md"
        onClick={handleImageClick}
        style={{ cursor: onTap ? 'crosshair' : 'default' }}
      />
      {showLabels && (
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: '100%', height: 'auto' }}
        />
      )}
    </div>
  )
}

