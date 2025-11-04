/**
 * Color name lookup for frontend
 * Subset of CSS + XKCD colors with RGB values
 * Full list is loaded on backend
 */

export interface ColorName {
  name: string
  hex: string
  rgb: [number, number, number]
}

// Common CSS colors + some XKCD colors for frontend quick lookup
export const colorNames: ColorName[] = [
  // CSS Basic Colors
  { name: 'black', hex: '#000000', rgb: [0, 0, 0] },
  { name: 'white', hex: '#FFFFFF', rgb: [255, 255, 255] },
  { name: 'red', hex: '#FF0000', rgb: [255, 0, 0] },
  { name: 'green', hex: '#008000', rgb: [0, 128, 0] },
  { name: 'blue', hex: '#0000FF', rgb: [0, 0, 255] },
  { name: 'yellow', hex: '#FFFF00', rgb: [255, 255, 0] },
  { name: 'cyan', hex: '#00FFFF', rgb: [0, 255, 255] },
  { name: 'magenta', hex: '#FF00FF', rgb: [255, 0, 255] },
  { name: 'orange', hex: '#FFA500', rgb: [255, 165, 0] },
  { name: 'pink', hex: '#FFC0CB', rgb: [255, 192, 203] },
  { name: 'purple', hex: '#800080', rgb: [128, 0, 128] },
  { name: 'brown', hex: '#A52A2A', rgb: [165, 42, 42] },
  { name: 'gray', hex: '#808080', rgb: [128, 128, 128] },
  { name: 'grey', hex: '#808080', rgb: [128, 128, 128] },
  
  // Common named colors
  { name: 'steel blue', hex: '#4682B4', rgb: [70, 130, 180] },
  { name: 'mustard', hex: '#FFDB58', rgb: [255, 219, 88] },
  { name: 'navy', hex: '#000080', rgb: [0, 0, 128] },
  { name: 'teal', hex: '#008080', rgb: [0, 128, 128] },
  { name: 'olive', hex: '#808000', rgb: [128, 128, 0] },
  { name: 'maroon', hex: '#800000', rgb: [128, 0, 0] },
  { name: 'lime', hex: '#00FF00', rgb: [0, 255, 0] },
  { name: 'aqua', hex: '#00FFFF', rgb: [0, 255, 255] },
  { name: 'silver', hex: '#C0C0C0', rgb: [192, 192, 192] },
  { name: 'gold', hex: '#FFD700', rgb: [255, 215, 0] },
]

/**
 * Find nearest color name by hex (simple frontend lookup)
 * For accurate results, use the API endpoint
 */
export function findNearestColorName(hex: string): ColorName | null {
  // Simple RGB distance - for production, use API with Lab ΔE2000
  let minDist = Infinity
  let nearest: ColorName | null = null
  
  const [r, g, b] = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)?.slice(1).map(x => parseInt(x, 16)) || []
  if (r === undefined) return null
  
  for (const color of colorNames) {
    const dist = Math.sqrt(
      Math.pow(r - color.rgb[0], 2) +
      Math.pow(g - color.rgb[1], 2) +
      Math.pow(b - color.rgb[2], 2)
    )
    if (dist < minDist) {
      minDist = dist
      nearest = color
    }
  }
  
  return nearest
}

