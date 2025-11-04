"""
Color analysis module for ChromaViews
Uses K-Means clustering to extract dominant colors from images
"""

import io
import logging
from typing import List, Dict, Tuple
import numpy as np
from PIL import Image, ImageEnhance
from sklearn.cluster import KMeans
from color_utils import rgb_to_lab, delta_e_cie2000
from color_names import ColorNameDB

logger = logging.getLogger(__name__)


class ColorAnalyzer:
    """Analyzes images to extract dominant colors using K-Means clustering"""
    
    def __init__(self):
        self.color_db: ColorNameDB = None
        self.max_dimension = 1280
    
    def set_color_db(self, color_db: ColorNameDB):
        """Set the color name database"""
        self.color_db = color_db
    
    def analyze(self, image_data: bytes, k: int = 8) -> Dict:
        """
        Analyze an image and extract dominant colors.
        
        Args:
            image_data: Raw image bytes (JPEG or PNG)
            k: Number of clusters (3-12)
        
        Returns:
            Dict with 'width', 'height', 'palette', and 'samples'
        """
        # Load and resize image
        try:
            img = Image.open(io.BytesIO(image_data))
            img = img.convert('RGB')
            original_width, original_height = img.size
        except Exception as e:
            raise ValueError(f"Failed to open image: {e}")
        
        # Resize if too large
        if max(original_width, original_height) > self.max_dimension:
            scale = self.max_dimension / max(original_width, original_height)
            new_width = int(original_width * scale)
            new_height = int(original_height * scale)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            logger.info(f"Resized image from {original_width}x{original_height} to {new_width}x{new_height}")                                                   
        
        # Enhance image for better color extraction (makes colors more vibrant)
        # This helps with real-world photos that may appear grayish
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.15)  # 15% brighter
        
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.2)  # 20% more contrast
        
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.3)  # 30% more saturated
        
        width, height = img.size
        
        # Convert to numpy array
        img_array = np.array(img)
        pixels = img_array.reshape(-1, 3)
        
        # K-Means clustering
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(pixels)
        
        # Get cluster centers (RGB)
        centers = kmeans.cluster_centers_.astype(int)
        labels = kmeans.labels_
        
        # Calculate percentages
        unique, counts = np.unique(labels, return_counts=True)
        percentages = (counts / len(labels)) * 100
        
        # Sort by percentage (descending)
        sorted_indices = np.argsort(percentages)[::-1]
        
        # Build palette
        palette = []
        for idx in sorted_indices:
            rgb = centers[idx]
            r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
            hex_color = f"#{r:02x}{g:02x}{b:02x}"
            
            # Convert to Lab
            lab = list(rgb_to_lab(r, g, b))
            
            # Find nearest color name
            name = "unknown"
            primary = None
            display_name = "unknown"
            if self.color_db:
                try:
                    hex_clean = hex_color.lstrip('#')
                    nearest = self.color_db.find_nearest_name(hex_clean)
                    name = nearest['name']
                    primary = nearest.get('primary', name.capitalize())
                    # Always show "Primary (specific)" format for consistency
                    display_name = f"{primary} ({name})"
                except Exception as e:
                    logger.warning(f"Failed to find color name for {hex_color}: {e}")
            
            palette.append({
                'hex': hex_color,
                'name': display_name,
                'percent': float(percentages[idx]),
                'rgb': [r, g, b],
                'lab': lab,
            })
        
        # Deduplicate near-duplicate colors (ΔE < 5)
        # Note: Store original palette before deduplication for sample generation
        original_palette = palette.copy()
        palette = self._deduplicate_palette(palette)
        
        # Generate sample points at actual color locations
        # Use original_palette to map back to cluster indices correctly
        samples = self._generate_samples_from_clusters(
            img_array, width, height, palette, original_palette, labels, centers, sorted_indices
        )
        
        return {
            'width': width,
            'height': height,
            'palette': palette,
            'samples': samples,
        }
    
    def _deduplicate_palette(self, palette: List[Dict]) -> List[Dict]:
        """
        Remove near-duplicate colors (ΔE < 5), keeping the one with higher percentage.
        """
        if len(palette) <= 1:
            return palette
        
        deduplicated = []
        for color in palette:
            is_duplicate = False
            lab = tuple(color['lab'])
            
            for existing in deduplicated:
                existing_lab = tuple(existing['lab'])
                delta_e = delta_e_cie2000(lab, existing_lab)
                
                if delta_e < 5:
                    # Keep the one with higher percentage
                    if color['percent'] > existing['percent']:
                        deduplicated.remove(existing)
                        deduplicated.append(color)
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                deduplicated.append(color)
        
        # Re-sort by percentage
        deduplicated.sort(key=lambda x: x['percent'], reverse=True)
        return deduplicated
    
    def _generate_samples_from_clusters(
        self, 
        img_array: np.ndarray, 
        width: int, 
        height: int, 
        palette: List[Dict],
        original_palette: List[Dict],
        labels: np.ndarray,
        centers: np.ndarray,
        sorted_indices: np.ndarray
    ) -> List[Dict]:
        """
        Generate sample points at actual locations where palette colors appear in the image.
        For each palette color, finds representative locations where that color is most prominent.
        """
        samples = []
        
        # Reshape labels back to image dimensions
        label_map = labels.reshape(height, width)
        
        # For each palette color, find clusters that match it and generate sample points
        for palette_color in palette:
            # Find all cluster indices that match this palette color
            # (including merged clusters from deduplication)
            matching_cluster_indices = []
            palette_lab = tuple(palette_color['lab'])
            
            for orig_idx, orig_color in enumerate(original_palette):
                orig_lab = tuple(orig_color['lab'])
                # Check if this cluster's color is close enough to the palette color
                # (within deduplication threshold)
                delta_e = delta_e_cie2000(palette_lab, orig_lab)
                if delta_e < 5:
                    matching_cluster_indices.append(sorted_indices[orig_idx])
            
            if not matching_cluster_indices:
                continue
            
            # Combine pixels from all matching clusters
            combined_mask = np.zeros((height, width), dtype=bool)
            for cluster_idx in matching_cluster_indices:
                combined_mask |= (label_map == cluster_idx)
            
            cluster_pixels = np.argwhere(combined_mask)
            
            if len(cluster_pixels) == 0:
                continue
            
            # Find representative sample points for this color
            # Strategy: Pick points that are well-distributed across the cluster region
            num_samples_for_color = min(3, max(1, len(cluster_pixels) // 100))  # 1-3 samples per color
            
            if num_samples_for_color == 1:
                # Pick the centroid of the cluster
                centroid = cluster_pixels.mean(axis=0).astype(int)
                y, x = centroid
                y = max(0, min(height - 1, y))
                x = max(0, min(width - 1, x))
                
                samples.append({
                    'x': int(x),
                    'y': int(y),
                    'hex': palette_color['hex'],
                    'name': palette_color['name'],
                })
            else:
                # Pick multiple well-distributed points
                # Use k-means on the cluster pixel positions to find distributed points
                try:
                    from sklearn.cluster import KMeans as KMeansSpatial
                    kmeans_spatial = KMeansSpatial(n_clusters=num_samples_for_color, random_state=42, n_init=10)
                    kmeans_spatial.fit(cluster_pixels)
                    
                    for center in kmeans_spatial.cluster_centers_:
                        y, x = center.astype(int)
                        y = max(0, min(height - 1, y))
                        x = max(0, min(width - 1, x))
                        
                        samples.append({
                            'x': int(x),
                            'y': int(y),
                            'hex': palette_color['hex'],
                            'name': palette_color['name'],
                        })
                except Exception:
                    # Fallback: pick evenly spaced points
                    step = len(cluster_pixels) // num_samples_for_color
                    for i in range(num_samples_for_color):
                        idx = i * step
                        if idx < len(cluster_pixels):
                            y, x = cluster_pixels[idx]
                            samples.append({
                                'x': int(x),
                                'y': int(y),
                                'hex': palette_color['hex'],
                                'name': palette_color['name'],
                            })
        
        return samples

