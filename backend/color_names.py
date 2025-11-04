"""
Color name database for ChromaViews
Loads CSS and XKCD color names and provides nearest name lookup
"""

import json
import os
import logging
from typing import Dict, List, Tuple
from color_utils import rgb_to_lab, delta_e_cie2000

logger = logging.getLogger(__name__)


# Primary color categories mapping
PRIMARY_COLORS = {
    'red', 'green', 'blue', 'yellow', 'orange', 'pink', 'purple', 
    'brown', 'gray', 'grey', 'black', 'white', 'cyan', 'magenta', 
    'teal', 'olive', 'navy', 'maroon', 'lime', 'aqua', 'silver', 'gold'
}

# Mapping of specific colors to primary categories
COLOR_TO_PRIMARY = {
    # Reds
    'crimson': 'Red', 'dark red': 'Red', 'maroon': 'Red', 'fire brick': 'Red',
    'indian red': 'Red', 'dark salmon': 'Red', 'salmon': 'Red',
    'light coral': 'Red', 'tomato': 'Red', 'coral': 'Red', 'orange red': 'Red',
    
    # Blues
    'navy': 'Blue', 'dark blue': 'Blue', 'steel blue': 'Blue', 'cornflower blue': 'Blue',
    'royal blue': 'Blue', 'dodger blue': 'Blue', 'deep sky blue': 'Blue',
    'sky blue': 'Blue', 'light blue': 'Blue', 'powder blue': 'Blue',
    'alice blue': 'Blue', 'cadet blue': 'Blue', 'slate blue': 'Blue',
    'dark slate blue': 'Blue', 'medium slate blue': 'Blue', 'medium blue': 'Blue',
    'midnight blue': 'Blue', 'indigo': 'Blue', 'dark orchid': 'Blue',
    'blue violet': 'Blue', 'dark violet': 'Blue', 'violet': 'Blue',
    
    # Greens
    'dark green': 'Green', 'forest green': 'Green', 'sea green': 'Green',
    'dark sea green': 'Green', 'medium sea green': 'Green', 'light sea green': 'Green',
    'pale green': 'Green', 'spring green': 'Green', 'lawn green': 'Green',
    'chartreuse': 'Green', 'green yellow': 'Green', 'yellow green': 'Green',
    'lime green': 'Green', 'lime': 'Green', 'olive': 'Green', 'dark olive green': 'Green',
    'olive drab': 'Green', 'dark khaki': 'Green',
    
    # Yellows/Oranges
    'gold': 'Yellow', 'dark goldenrod': 'Yellow', 'goldenrod': 'Yellow',
    'khaki': 'Yellow', 'yellow green': 'Yellow', 'green yellow': 'Yellow',
    'lemon chiffon': 'Yellow', 'light yellow': 'Yellow', 'light goldenrod yellow': 'Yellow',
    'papaya whip': 'Yellow', 'moccasin': 'Yellow', 'peach puff': 'Yellow',
    'pale goldenrod': 'Yellow', 'mustard': 'Yellow', 'dark orange': 'Orange',
    'orange red': 'Orange', 'tomato': 'Orange', 'coral': 'Orange',
    'sandy brown': 'Orange', 'peru': 'Orange', 'chocolate': 'Orange',
    'saddle brown': 'Orange', 'sienna': 'Orange', 'burlywood': 'Orange',
    'tan': 'Orange', 'wheat': 'Orange', 'bisque': 'Orange',
    
    # Pinks
    'hot pink': 'Pink', 'deep pink': 'Pink', 'light pink': 'Pink',
    'pale violet red': 'Pink', 'medium violet red': 'Pink', 'fuchsia': 'Pink',
    'magenta': 'Pink', 'lavender blush': 'Pink', 'misty rose': 'Pink',
    
    # Purples
    'blue violet': 'Purple', 'indigo': 'Purple', 'dark violet': 'Purple',
    'medium purple': 'Purple', 'thistle': 'Purple', 'plum': 'Purple',
    'violet': 'Purple', 'orchid': 'Purple', 'medium orchid': 'Purple',
    'dark orchid': 'Purple', 'dark magenta': 'Purple', 'purple': 'Purple',
    
    # Browns
    'maroon': 'Brown', 'dark red': 'Brown', 'sienna': 'Brown',
    'saddle brown': 'Brown', 'chocolate': 'Brown', 'peru': 'Brown',
    'burlywood': 'Brown', 'tan': 'Brown', 'rosy brown': 'Brown',
    'sandy brown': 'Brown', 'wheat': 'Brown', 'navajo white': 'Brown',
    'bisque': 'Brown', 'peach puff': 'Brown', 'moccasin': 'Brown',
    
    # Grays
    'dim gray': 'Gray', 'dark gray': 'Gray', 'light gray': 'Gray',
    'slate gray': 'Gray', 'dark slate gray': 'Gray', 'light slate gray': 'Gray',
    'gainsboro': 'Gray', 'silver': 'Gray', 'alice blue': 'Gray',
    'ghost white': 'Gray', 'snow': 'Gray', 'white smoke': 'Gray',
    'ivory': 'Gray', 'beige': 'Gray', 'old lace': 'Gray',
    'floral white': 'Gray', 'linen': 'Gray', 'antique white': 'Gray',
    'papaya whip': 'Gray', 'blanched almond': 'Gray', 'bisque': 'Gray',
    
    # Blacks/Whites
    'black': 'Black', 'dim gray': 'Black', 'dark slate gray': 'Black',
    'navy': 'Black', 'midnight blue': 'Black', 'white': 'White',
    'snow': 'White', 'honeydew': 'White', 'mint cream': 'White',
    'azure': 'White', 'alice blue': 'White', 'ghost white': 'White',
    'white smoke': 'White', 'seashell': 'White', 'beige': 'White',
    'old lace': 'White', 'floral white': 'White', 'ivory': 'White',
    'antique white': 'White', 'linen': 'White', 'lavender blush': 'White',
    'misty rose': 'White', 'cornsilk': 'White', 'blanched almond': 'White',
    
    # Cyans/Teals
    'aqua': 'Cyan', 'cyan': 'Cyan', 'light cyan': 'Cyan', 'pale turquoise': 'Cyan',
    'aquamarine': 'Cyan', 'turquoise': 'Cyan', 'medium turquoise': 'Cyan',
    'dark turquoise': 'Cyan', 'cadet blue': 'Cyan', 'teal': 'Teal',
    'dark cyan': 'Teal', 'medium aquamarine': 'Teal',
}


def get_primary_color(specific_name: str) -> str:
    """
    Get the primary color category for a specific color name.
    Returns the capitalized primary color, or the capitalized specific name if it's already a primary color.
    """
    name_lower = specific_name.lower().strip()
    
    # If it's already a primary color, return it capitalized
    if name_lower in PRIMARY_COLORS:
        return specific_name.capitalize()
    
    # Look up in mapping
    primary = COLOR_TO_PRIMARY.get(name_lower)
    if primary:
        return primary
    
    # Default: try to infer from name (e.g., "dark red" -> "Red")
    words = name_lower.split()
    for word in words:
        if word in PRIMARY_COLORS:
            return word.capitalize()
    
    # Fallback: return the name capitalized
    return specific_name.capitalize()


class ColorNameDB:
    """Database of named colors with RGB and Lab values"""
    
    def __init__(self):
        self.names: List[Dict] = []
    
    def load_names(self):
        """Load color names from embedded data or JSON file"""
        # In production, load from a JSON file with CSS + XKCD colors
        # For now, we'll use a comprehensive embedded list
        
        # CSS basic colors
        css_colors = [
            ('black', '#000000'), ('white', '#FFFFFF'), ('red', '#FF0000'),
            ('green', '#008000'), ('blue', '#0000FF'), ('yellow', '#FFFF00'),
            ('cyan', '#00FFFF'), ('magenta', '#FF00FF'), ('orange', '#FFA500'),
            ('pink', '#FFC0CB'), ('purple', '#800080'), ('brown', '#A52A2A'),
            ('gray', '#808080'), ('grey', '#808080'), ('navy', '#000080'),
            ('teal', '#008080'), ('olive', '#808000'), ('maroon', '#800000'),
            ('lime', '#00FF00'), ('aqua', '#00FFFF'), ('silver', '#C0C0C0'),
            ('gold', '#FFD700'), ('steel blue', '#4682B4'), ('mustard', '#FFDB58'),
        ]
        
        # Extended color list (CSS extended + common XKCD colors)
        # In production, this would be loaded from a JSON file
        extended_colors = [
            ('alice blue', '#F0F8FF'), ('antique white', '#FAEBD7'),
            ('aquamarine', '#7FFFD4'), ('azure', '#F0FFFF'),
            ('beige', '#F5F5DC'), ('bisque', '#FFE4C4'),
            ('blanched almond', '#FFEBCD'), ('blue violet', '#8A2BE2'),
            ('burlywood', '#DEB887'), ('cadet blue', '#5F9EA0'),
            ('chartreuse', '#7FFF00'), ('chocolate', '#D2691E'),
            ('coral', '#FF7F50'), ('cornflower blue', '#6495ED'),
            ('cornsilk', '#FFF8DC'), ('crimson', '#DC143C'),
            ('dark blue', '#00008B'), ('dark cyan', '#008B8B'),
            ('dark goldenrod', '#B8860B'), ('dark gray', '#A9A9A9'),
            ('dark green', '#006400'), ('dark khaki', '#BDB76B'),
            ('dark magenta', '#8B008B'), ('dark olive green', '#556B2F'),
            ('dark orange', '#FF8C00'), ('dark orchid', '#9932CC'),
            ('dark red', '#8B0000'), ('dark salmon', '#E9967A'),
            ('dark sea green', '#8FBC8F'), ('dark slate blue', '#483D8B'),
            ('dark slate gray', '#2F4F4F'), ('dark turquoise', '#00CED1'),
            ('dark violet', '#9400D3'), ('deep pink', '#FF1493'),
            ('deep sky blue', '#00BFFF'), ('dim gray', '#696969'),
            ('dodger blue', '#1E90FF'), ('fire brick', '#B22222'),
            ('floral white', '#FFFAF0'), ('forest green', '#228B22'),
            ('fuchsia', '#FF00FF'), ('gainsboro', '#DCDCDC'),
            ('ghost white', '#F8F8FF'), ('gold', '#FFD700'),
            ('goldenrod', '#DAA520'), ('green yellow', '#ADFF2F'),
            ('honeydew', '#F0FFF0'), ('hot pink', '#FF69B4'),
            ('indian red', '#CD5C5C'), ('indigo', '#4B0082'),
            ('ivory', '#FFFFF0'), ('khaki', '#F0E68C'),
            ('lavender', '#E6E6FA'), ('lavender blush', '#FFF0F5'),
            ('lawn green', '#7CFC00'), ('lemon chiffon', '#FFFACD'),
            ('light blue', '#ADD8E6'), ('light coral', '#F08080'),
            ('light cyan', '#E0FFFF'), ('light goldenrod yellow', '#FAFAD2'),
            ('light gray', '#D3D3D3'), ('light green', '#90EE90'),
            ('light pink', '#FFB6C1'), ('light salmon', '#FFA07A'),
            ('light sea green', '#20B2AA'), ('light sky blue', '#89CEF0'),
            ('light slate gray', '#778899'), ('light steel blue', '#B0C4DE'),
            ('light yellow', '#FFFFE0'), ('lime green', '#32CD32'),
            ('linen', '#FAF0E6'), ('medium aquamarine', '#66CDAA'),
            ('medium blue', '#0000CD'), ('medium orchid', '#BA55D3'),
            ('medium purple', '#9370DB'), ('medium sea green', '#4EEB3A'),
            ('medium slate blue', '#7B68EE'), ('medium spring green', '#00FA9A'),
            ('medium turquoise', '#48D1CC'), ('medium violet red', '#C71585'),
            ('midnight blue', '#191970'), ('mint cream', '#F5FFFA'),
            ('misty rose', '#FFE4E1'), ('moccasin', '#FFE4B5'),
            ('navajo white', '#FFDEAD'), ('old lace', '#FDF5E6'),
            ('olive drab', '#6B8E23'), ('orange red', '#FF4500'),
            ('orchid', '#DA70D6'), ('pale goldenrod', '#EEE8AA'),
            ('pale green', '#98FB98'), ('pale turquoise', '#AFEEEE'),
            ('pale violet red', '#DB7093'), ('papaya whip', '#FFEFD5'),
            ('peach puff', '#FFDAB9'), ('peru', '#CD853F'),
            ('plum', '#DDA0DD'), ('powder blue', '#B0E0E6'),
            ('rosy brown', '#BC8F8F'), ('royal blue', '#4169E1'),
            ('saddle brown', '#8B4513'), ('salmon', '#FA8072'),
            ('sandy brown', '#F4A460'), ('sea green', '#2E8B57'),
            ('sea shell', '#FFF5EE'), ('sienna', '#A0522D'),
            ('sky blue', '#87CEEB'), ('slate blue', '#6A5ACD'),
            ('slate gray', '#708090'), ('snow', '#FFFAFA'),
            ('spring green', '#00FF7F'), ('tan', '#D2B48C'),
            ('thistle', '#D8BFD8'), ('tomato', '#FF6347'),
            ('turquoise', '#40E0D0'), ('violet', '#EE82EE'),
            ('wheat', '#F5DEB3'), ('white smoke', '#F5F5F5'),
            ('yellow green', '#9ACD32'),
        ]
        
        all_colors = css_colors + extended_colors
        
        # Convert to RGB and Lab, store in database
        for name, hex_color in all_colors:
            try:
                rgb = self._hex_to_rgb(hex_color)
                lab = self._rgb_to_lab(rgb)
                
                self.names.append({
                    'name': name,
                    'hex': hex_color,
                    'rgb': rgb,
                    'lab': lab,
                })
            except Exception as e:
                logger.warning(f"Failed to process color {name} ({hex_color}): {e}")
        
        logger.info(f"Loaded {len(self.names)} color names")
    
    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def _rgb_to_lab(self, rgb: Tuple[int, int, int]) -> Tuple[float, float, float]:
        """Convert RGB to Lab"""
        return rgb_to_lab(rgb[0], rgb[1], rgb[2])
    
    def find_nearest_name(self, hex_color: str) -> Dict:
        """
        Find the nearest color name using ΔE2000 distance in Lab space.
        
        Args:
            hex_color: 6-digit hex color (without #)
        
        Returns:
            Dict with 'name', 'primary', and 'deltaE'
        """
        # Convert input hex to Lab
        hex_with_hash = f"#{hex_color}"
        rgb = self._hex_to_rgb(hex_with_hash)
        target_lab = self._rgb_to_lab(rgb)
        
        # Find nearest color
        min_delta_e = float('inf')
        nearest = None
        
        for color in self.names:
            color_lab = tuple(color['lab'])
            delta_e = delta_e_cie2000(target_lab, color_lab)
            
            if delta_e < min_delta_e:
                min_delta_e = delta_e
                nearest = color
        
        if not nearest:
            raise ValueError(f"No color names loaded")
        
        specific_name = nearest['name']
        primary_color = get_primary_color(specific_name)
        
        return {
            'name': specific_name,
            'primary': primary_color,
            'deltaE': min_delta_e
        }

