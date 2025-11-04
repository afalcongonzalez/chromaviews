/**
 * API client for ChromaViews backend
 */

export interface PaletteColor {
  hex: string
  name: string
  percent: number
  rgb: [number, number, number]
  lab: [number, number, number]
}

export interface SamplePoint {
  x: number
  y: number
  hex: string
  name: string
}

export interface AnalyzeResponse {
  width: number
  height: number
  palette: PaletteColor[]
  samples: SamplePoint[]
}

export interface NameResponse {
  name: string
  primary?: string
  deltaE: number
}

/**
 * Get API base URL from environment or config
 */
function getApiBase(): string {
  // Check for injected config (production)
  if (typeof window !== 'undefined' && (window as any).__CONFIG__?.API_BASE) {
    return (window as any).__CONFIG__.API_BASE
  }
  // Check environment variable (development)
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE
  }
  // In production (single container), use relative path (same origin)
  // In development, use localhost
  if (typeof window !== 'undefined') {
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (!isDev) {
      // Production: use relative path, Nginx will proxy /api to backend
      return ''
    }
  }
  // Development fallback
  return 'http://localhost:8000'
}

/**
 * Get API path with /api prefix
 */
function getApiPath(): string {
  const apiBase = getApiBase()
  // If base already ends with /api, use as-is
  if (apiBase.endsWith('/api')) {
    return apiBase
  }
  // Otherwise add /api prefix
  return `${apiBase.replace(/\/$/, '')}/api`
}

/**
 * Analyze an image and get color palette
 */
export async function analyzeImage(file: File, k: number = 8): Promise<AnalyzeResponse> {
  const formData = new FormData()
  
  // iOS camera files might not have a filename, so ensure we provide one
  // Extract extension from MIME type if filename is missing
  let fileName = file.name || 'image'
  if (!fileName || fileName === 'image' || !fileName.includes('.')) {
    // Try to determine extension from MIME type
    if (file.type) {
      if (file.type.includes('jpeg') || file.type.includes('jpg')) {
        fileName = 'image.jpg'
      } else if (file.type.includes('png')) {
        fileName = 'image.png'
      } else {
        fileName = 'image.jpg' // Default to jpg
      }
    } else {
      fileName = 'image.jpg' // Default if no MIME type
    }
  }
  
  // Create a new File with proper name if needed (iOS compatibility)
  // Check if filename is missing or empty (iOS camera files sometimes have no name)
  const fileToUpload = (file.name && file.name.trim()) ? file : new File([file], fileName, { type: file.type || 'image/jpeg' })
  
  formData.append('image', fileToUpload)
  
  const apiPath = getApiPath()
  const url = `${apiPath}/analyze?k=${k}`
  
  // Log request details for debugging
  console.log('Uploading image:', {
    fileName: fileToUpload.name,
    fileSize: `${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB`,
    fileType: fileToUpload.type,
    originalFileName: file.name,
    originalFileType: file.type,
    apiPath,
    url,
  })
  
  const controller = new AbortController()
  // Increase timeout to 30s for large images (iPhone photos can take time to process)
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
  
  try {
    console.log('Starting fetch request to:', url)
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    console.log('Fetch response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })
    
    if (!response.ok) {
      // Try to get detailed error message from backend
      let errorMsg = `HTTP ${response.status}: ${response.statusText}`
      let errorDetails: any = {}
      
      try {
        const contentType = response.headers.get('content-type')
        console.log('Response content-type:', contentType)
        
        if (contentType?.includes('application/json')) {
          const errorJson = await response.json()
          console.log('Error JSON response:', errorJson)
          errorMsg = errorJson.detail || errorJson.error || errorJson.message || errorMsg
          errorDetails = errorJson
        } else {
          const errorText = await response.text()
          console.log('Error text response:', errorText)
          if (errorText) {
            // Try to parse as JSON if it looks like JSON
            try {
              const parsed = JSON.parse(errorText)
              errorMsg = parsed.detail || parsed.error || parsed.message || errorText
              errorDetails = parsed
            } catch {
              errorMsg = errorText || errorMsg
              errorDetails = { rawText: errorText }
            }
          }
        }
      } catch (parseError: any) {
        console.error('Error parsing error response:', parseError)
        errorDetails = { parseError: parseError.message }
      }
      
      console.error('API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorMsg,
        errorDetails,
      })
      
      const fullError = new Error(errorMsg)
      ;(fullError as any).status = response.status
      ;(fullError as any).details = errorDetails
      throw fullError
    }
    
    const result = await response.json()
    console.log('Analysis successful')
    return result
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    // Log full error details
    console.error('Image analysis error caught:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: error.status,
      details: error.details,
      type: error.constructor.name,
      url,
    })
    
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request timed out after 30 seconds. The image may be too large. Please try with a smaller image.')
      ;(timeoutError as any).originalError = error
      throw timeoutError
    }
    
    // Handle network errors (fetch failures, CORS, etc.)
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') || 
        error.name === 'TypeError' ||
        error.message?.includes('Network request failed')) {
      const networkError = new Error(
        `Network error: ${error.message || 'Failed to connect to server'}. ` +
        `Please check your internet connection and try again. ` +
        `URL: ${url}`
      )
      ;(networkError as any).originalError = error
      throw networkError
    }
    
    // If we have a status, it's an HTTP error - include details
    if (error.status) {
      const httpError = new Error(error.message || `HTTP ${error.status} error`)
      ;(httpError as any).status = error.status
      ;(httpError as any).details = error.details
      throw httpError
    }
    
    // Pass through the error message (should contain backend error details)
    throw error
  }
}

/**
 * Get color name for a hex value
 */
export async function getColorName(hex: string): Promise<NameResponse> {
  // Remove # if present
  const hexClean = hex.replace('#', '')
  
  const apiPath = getApiPath()
  const url = `${apiPath}/name?hex=${hexClean}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  
  return await response.json()
}

