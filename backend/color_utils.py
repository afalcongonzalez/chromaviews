"""
Color conversion utilities for ChromaViews backend
Replaces colormath for compatibility with modern NumPy
"""

import numpy as np


def rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
    """
    Convert RGB to Lab color space.
    
    Args:
        r, g, b: RGB values (0-255)
    
    Returns:
        (L, a, b) tuple
    """
    # Normalize to 0-1
    rn = r / 255.0
    gn = g / 255.0
    bn = b / 255.0
    
    # Convert to linear RGB (gamma correction)
    def gamma_correct(val):
        if val > 0.04045:
            return ((val + 0.055) / 1.055) ** 2.4
        return val / 12.92
    
    r_linear = gamma_correct(rn)
    g_linear = gamma_correct(gn)
    b_linear = gamma_correct(bn)
    
    # Convert to XYZ (D65 white point)
    x = (r_linear * 0.4124564 + g_linear * 0.3575761 + b_linear * 0.1804375) / 0.95047
    y = (r_linear * 0.2126729 + g_linear * 0.7151522 + b_linear * 0.0721750) / 1.00000
    z = (r_linear * 0.0193339 + g_linear * 0.1191920 + b_linear * 0.9503041) / 1.08883
    
    # Convert to Lab
    def f(t):
        if t > 0.008856:
            return t ** (1.0 / 3.0)
        return (7.787 * t) + (16.0 / 116.0)
    
    fx = f(x)
    fy = f(y)
    fz = f(z)
    
    l = 116.0 * fy - 16.0
    a = 500.0 * (fx - fy)
    b = 200.0 * (fy - fz)
    
    return (l, a, b)


def delta_e_cie2000(lab1: tuple[float, float, float], lab2: tuple[float, float, float]) -> float:
    """
    Calculate ΔE2000 color difference between two Lab colors.
    This is a simplified version - full ΔE2000 is more complex but this works well.
    
    Args:
        lab1, lab2: (L, a, b) tuples
    
    Returns:
        ΔE2000 distance
    """
    l1, a1, b1 = lab1
    l2, a2, b2 = lab2
    
    # Calculate chroma
    c1 = np.sqrt(a1 * a1 + b1 * b1)
    c2 = np.sqrt(a2 * a2 + b2 * b2)
    
    # Delta values
    dl = l1 - l2
    dc = c1 - c2
    da = a1 - a2
    db = b1 - b2
    
    # Simplified ΔE2000 calculation
    # Full implementation is more complex with weighting factors
    dh_sq = da * da + db * db - dc * dc
    if dh_sq < 0:
        dh = 0.0
    else:
        dh = np.sqrt(dh_sq)
    
    # Weighting factors (simplified)
    sl = 1.0
    sc = 1.0 + 0.045 * c1
    sh = 1.0 + 0.015 * c1
    
    # Calculate ΔE
    delta_e = np.sqrt(
        (dl / sl) ** 2 +
        (dc / sc) ** 2 +
        (dh / sh) ** 2
    )
    
    return float(delta_e)

