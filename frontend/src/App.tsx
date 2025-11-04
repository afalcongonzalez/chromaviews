import { useState } from 'react'
import { ImagePicker } from './components/ImagePicker'
import { PaletteGrid } from './components/PaletteGrid'
import { ImageWithLabels } from './components/ImageWithLabels'
import { Toggle } from './components/Toggle'
import { ToastManager } from './components/Toast'
import { Loader } from './components/Loader'
import { analyzeImage, getColorName, type AnalyzeResponse } from './lib/api'

function App() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(false)
  const [toasts, setToasts] = useState<string[]>([])

  const handleImageSelect = async (file: File) => {
    setImageFile(file)
    setError(null)
    setAnalysis(null) // Clear previous analysis
    setShowLabels(false) // Reset labels
    
    // Create object URL for preview
    const url = URL.createObjectURL(file)
    setImageUrl(url)

    // Analyze image
    setLoading(true)
    try {
      const result = await analyzeImage(file, 8)
      setAnalysis(result)
      // Automatically show labels after analysis completes
      setShowLabels(true)
    } catch (err: any) {
      // Log full error details for debugging
      const errorInfo = {
        message: err.message,
        name: err.name,
        stack: err.stack,
        status: err.status,
        details: err.details,
        originalError: err.originalError,
        file: {
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          type: file.type,
        },
      }
      
      console.error('Full error details:', errorInfo)
      
      // Build a comprehensive error message
      let errorMessage = err.message || 'Failed to analyze image'
      
      // Add status code if available
      if (err.status) {
        errorMessage = `[HTTP ${err.status}] ${errorMessage}`
      }
      
      // Add error type if it's not obvious
      if (err.name && err.name !== 'Error') {
        errorMessage = `[${err.name}] ${errorMessage}`
      }
      
      // Add details if available
      if (err.details && typeof err.details === 'object') {
        const detailsStr = JSON.stringify(err.details, null, 2)
        errorMessage = `${errorMessage}\n\nDetails:\n${detailsStr}`
      }
      
      // Add file info for debugging
      errorMessage = `${errorMessage}\n\nFile: ${file.name || 'no-name'} (${(file.size / (1024 * 1024)).toFixed(2)} MB, ${file.type || 'no-type'})`
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyHex = (hex: string) => {
    setToasts([...toasts, `Copied ${hex} to clipboard`])
    setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, 3000)
  }

  const handleImageTap = async (x: number, y: number, hex: string) => {
    try {
      const result = await getColorName(hex)
      const displayName = result.primary && result.primary.toLowerCase() !== result.name.toLowerCase()
        ? `${result.primary} (${result.name})`
        : result.name
      setToasts([...toasts, `Tapped color: ${displayName} (${hex})`])
      setTimeout(() => {
        setToasts((prev) => prev.slice(1))
      }, 3000)
    } catch (err) {
      console.error('Failed to get color name:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">ChromaViews</h1>
          <p className="text-sm text-gray-600 mt-1">See every color</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Image Upload Section */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Image
            </h2>
            <ImagePicker
              onImageSelect={handleImageSelect}
              disabled={loading}
            />
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900 mb-2">Error:</p>
                    <p className="text-sm text-red-800 whitespace-pre-wrap break-words">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(error).then(() => {
                        setToasts((prev) => [...prev, 'Error copied to clipboard'])
                        setTimeout(() => {
                          setToasts((prev) => prev.slice(1))
                        }, 3000)
                      }).catch(() => {
                        // Fallback if clipboard API fails
                      })
                    }}
                    className="ml-4 text-red-600 hover:text-red-800 text-xs underline whitespace-nowrap"
                    title="Copy error to clipboard"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Loading State - Show modern loader */}
          {loading && (
            <section className="bg-white rounded-lg shadow-md p-6">
              <Loader />
            </section>
          )}

          {/* Image Display - Only show after analysis completes */}
          {imageUrl && analysis && !loading && (
            <section className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Color Labels
                </h2>
                <Toggle
                  label="Show labels"
                  checked={showLabels}
                  onChange={setShowLabels}
                />
              </div>
              <ImageWithLabels
                imageUrl={imageUrl}
                samples={analysis.samples}
                showLabels={showLabels}
                onTap={handleImageTap}
                width={analysis.width}
                height={analysis.height}
              />
            </section>
          )}

          {/* Color Palette - Secondary information */}
          {analysis && (
            <section className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Dominant Colors
              </h2>
              <PaletteGrid
                palette={analysis.palette}
                onCopy={handleCopyHex}
              />
            </section>
          )}
        </div>
      </main>

      <ToastManager
        toasts={toasts}
        onRemove={(index) => {
          setToasts((prev) => prev.filter((_, i) => i !== index))
        }}
      />
    </div>
  )
}

export default App

