"""
ChromaViews Backend API
FastAPI application for color analysis
"""

import os
import time
import logging
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from color_analyzer import ColorAnalyzer
from color_names import ColorNameDB

# Configure logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'info').upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="ChromaViews API", version="1.0.0")

# CORS configuration
allowed_origins_str = os.getenv(
    'ALLOWED_ORIGINS',
    'http://localhost:5173,https://chromaviews.com,https://www.chromaviews.com'
)
# Split and strip whitespace from origins
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(',') if origin.strip()]

logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,  # Set to False for simple CORS
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Initialize color analyzer and name database
analyzer = ColorAnalyzer()
color_db = ColorNameDB()

# Load color names on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Loading color name database...")
    color_db.load_names()
    analyzer.set_color_db(color_db)
    logger.info(f"Loaded {len(color_db.names)} color names")


class AnalyzeResponse(BaseModel):
    width: int
    height: int
    palette: list[dict]
    samples: list[dict]


class NameResponse(BaseModel):
    name: str
    primary: str = ""
    deltaE: float


@app.get("/healthz")
async def healthz():
    """Health check endpoint"""
    return {"status": "ok"}


@app.get("/api/test")
async def test_cors():
    """Test endpoint to verify CORS is working"""
    return {"message": "CORS is working", "origins": allowed_origins}


@app.options("/api/{path:path}")
async def options_handler(path: str):
    """Handle OPTIONS preflight requests"""
    return {"status": "ok"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_image(
    image: UploadFile = File(...),
    k: int = Query(8, ge=3, le=12)
):
    """
    Analyze an image and extract dominant colors using K-Means clustering.
    
    Args:
        image: JPEG or PNG image file (max 10 MB)
        k: Number of clusters (3-12, default 8)
    
    Returns:
        JSON with image dimensions, color palette, and sample points
    """
    start_time = time.time()
    
    # Log request details for debugging
    filename = image.filename or 'no-filename'
    content_type = image.content_type or 'no-content-type'
    logger.info(f"Analyze request received: filename={filename}, content_type={content_type}, k={k}")
    
    # Read file first (needed for size check and iOS compatibility)
    try:
        contents = await image.read()
        file_size_mb = len(contents) / (1024 * 1024)
        max_size_mb = float(os.getenv('MAX_IMAGE_MB', '10'))
        
        logger.info(f"File read: size={file_size_mb:.2f} MB, max_allowed={max_size_mb} MB")
        
        if file_size_mb > max_size_mb:
            error_msg = f"Image size ({file_size_mb:.1f} MB) exceeds maximum ({max_size_mb} MB). Please compress the image first."
            logger.warning(f"File too large: {error_msg}")
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Failed to read image file: {str(e)}"
        logger.error(f"Error reading file - filename={filename}, content_type={content_type}, error={error_msg}", exc_info=True)
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Validate file type - be lenient for iOS camera files
    # Check MIME type and file extension as fallback
    # iOS camera files may have no filename, empty MIME type, etc.
    file_ext = filename.lower().split('.')[-1] if '.' in filename and filename else ''
    
    allowed_mime_types = ['image/jpeg', 'image/jpg', 'image/png']
    allowed_extensions = ['jpg', 'jpeg', 'png']
    
    # Be very lenient for iOS - allow if:
    # 1. MIME type is valid
    # 2. Extension is valid  
    # 3. Empty MIME type (iOS sometimes sends this)
    # 4. No filename at all (iOS camera capture)
    # 5. MIME type starts with "image/" (catch-all for image types)
    is_valid = (
        content_type in allowed_mime_types or 
        file_ext in allowed_extensions or
        content_type == '' or  # Empty MIME type from iOS
        not filename or filename == 'no-filename' or  # No filename from iOS camera
        (content_type.startswith('image/') if content_type else False)
    )
    
    logger.info(f"File validation: filename={filename}, content_type={content_type}, ext={file_ext}, is_valid={is_valid}")
    
    if not is_valid and len(contents) > 0:
        error_msg = f"Only JPEG and PNG images are supported. Received: filename={filename}, content_type={content_type}, ext={file_ext}"
        logger.warning(error_msg)
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    
    # Analyze image (PIL will validate the actual image format)
    try:
        logger.info(f"Starting image analysis: size={len(contents)} bytes")
        result = analyzer.analyze(contents, k)
        
        elapsed = time.time() - start_time
        logger.info(f"Analysis completed successfully in {elapsed:.2f}s for {filename}")
        
        return AnalyzeResponse(**result)
    except ValueError as e:
        # PIL validation error
        error_msg = f"Invalid image format: {str(e)}"
        logger.error(f"PIL validation error - filename={filename}, content_type={content_type}, size={len(contents)} bytes, error={error_msg}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    except Exception as e:
        error_msg = f"Failed to analyze image: {str(e)}"
        logger.error(f"Analysis error - filename={filename}, content_type={content_type}, size={len(contents)} bytes, error={error_msg}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )


@app.get("/api/name", response_model=NameResponse)
async def get_color_name(hex: str = Query(..., regex="^[0-9a-fA-F]{6}$")):
    """
    Get the nearest color name for a hex value.
    
    Args:
        hex: 6-digit hex color (without #)
    
    Returns:
        JSON with 'name', 'primary', and 'deltaE'
    """
    try:
        result = color_db.find_nearest_name(hex)
        return NameResponse(
            name=result['name'],
            primary=result.get('primary', result['name'].capitalize()),
            deltaE=result['deltaE']
        )
    except Exception as e:
        logger.error(f"Error finding color name: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to find color name: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

