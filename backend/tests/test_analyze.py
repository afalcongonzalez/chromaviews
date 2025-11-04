"""
Tests for ChromaViews backend
"""

import pytest
import io
from PIL import Image
from fastapi.testclient import TestClient
from app import app
from color_analyzer import ColorAnalyzer
from color_names import ColorNameDB

client = TestClient(app)


def create_test_image(width=100, height=100, color=(255, 0, 0)) -> bytes:
    """Create a simple test image"""
    img = Image.new('RGB', (width, height), color)
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    return buffer.getvalue()


def test_healthz():
    """Test health check endpoint"""
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_analyze_endpoint():
    """Test image analysis endpoint"""
    image_data = create_test_image(200, 200, (255, 0, 0))
    
    response = client.post(
        "/api/analyze?k=5",
        files={"image": ("test.jpg", image_data, "image/jpeg")}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "width" in data
    assert "height" in data
    assert "palette" in data
    assert "samples" in data
    
    assert isinstance(data["palette"], list)
    assert len(data["palette"]) > 0
    
    # Check palette structure
    color = data["palette"][0]
    assert "hex" in color
    assert "name" in color
    assert "percent" in color
    assert "rgb" in color
    assert "lab" in color
    
    # Check samples structure
    assert isinstance(data["samples"], list)
    if len(data["samples"]) > 0:
        sample = data["samples"][0]
        assert "x" in sample
        assert "y" in sample
        assert "hex" in sample
        assert "name" in sample


def test_analyze_invalid_file_type():
    """Test analysis with invalid file type"""
    response = client.post(
        "/api/analyze",
        files={"image": ("test.txt", b"not an image", "text/plain")}
    )
    assert response.status_code == 400


def test_name_endpoint():
    """Test color name endpoint"""
    response = client.get("/api/name?hex=FF0000")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "deltaE" in data
    assert isinstance(data["deltaE"], (int, float))


def test_name_endpoint_invalid_hex():
    """Test color name endpoint with invalid hex"""
    response = client.get("/api/name?hex=INVALID")
    assert response.status_code == 422  # Validation error


def test_color_analyzer():
    """Test ColorAnalyzer directly"""
    analyzer = ColorAnalyzer()
    color_db = ColorNameDB()
    color_db.load_names()
    analyzer.set_color_db(color_db)
    
    image_data = create_test_image(100, 100, (128, 128, 128))
    result = analyzer.analyze(image_data, k=5)
    
    assert "width" in result
    assert "height" in result
    assert "palette" in result
    assert "samples" in result
    assert len(result["palette"]) > 0


def test_color_names_db():
    """Test ColorNameDB"""
    db = ColorNameDB()
    db.load_names()
    
    assert len(db.names) > 0
    
    # Test finding nearest name
    result = db.find_nearest_name("FF0000")
    assert "name" in result
    assert "deltaE" in result

