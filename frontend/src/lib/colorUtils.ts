/**
 * Color utility functions for ChromaViews
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface LAB {
  l: number
  a: number
  b: number
}

/**
 * Convert HEX to RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

/**
 * Convert RGB to HEX
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')}`
}

/**
 * Convert RGB to relative luminance (0-1)
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Convert RGB to Lab color space
 * Simplified conversion (assumes sRGB D65 white point)
 */
export function rgbToLab(r: number, g: number, b: number): LAB {
  // Normalize to 0-1
  let [rn, gn, bn] = [r / 255, g / 255, b / 255]

  // Apply gamma correction
  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92

  // Convert to XYZ (D65 white point)
  let x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047
  let y = (rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750) / 1.00000
  let z = (rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041) / 1.08883

  // Convert to Lab
  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116)
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116)
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116)

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

/**
 * Calculate ΔE2000 color difference between two Lab colors
 * Simplified version - full implementation is more complex
 */
export function deltaE2000(lab1: LAB, lab2: LAB): number {
  // Simplified ΔE2000 - for production, use a more complete implementation
  // This is a reasonable approximation
  const dL = lab1.l - lab2.l
  const da = lab1.a - lab2.a
  const db = lab1.b - lab2.b
  const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b)
  const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b)
  const dc = c1 - c2
  const dh = Math.sqrt(da * da + db * db - dc * dc)
  
  const sl = 1
  const sc = 1 + 0.045 * c1
  const sh = 1 + 0.015 * c1
  
  return Math.sqrt(
    Math.pow(dL / sl, 2) +
    Math.pow(dc / sc, 2) +
    Math.pow(dh / sh, 2)
  )
}

/**
 * Determine if text should be black or white based on background luminance
 */
export function getTextColor(hex: string): 'black' | 'white' {
  const rgb = hexToRgb(hex)
  const lum = luminance(rgb.r, rgb.g, rgb.b)
  return lum > 0.5 ? 'black' : 'white'
}

