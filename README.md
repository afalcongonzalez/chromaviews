# ChromaViews

**See every color** — A mobile-friendly web app that identifies and labels colors in photos.

---

## 🌐 [Visit ChromaViews.com →](https://chromaviews.com)

**Try it now**: Upload a photo and instantly see every color identified and labeled!

---

## Features

- 📸 **Take or upload photos** — Mobile camera support with desktop fallback
- 🎨 **Color palette extraction** — K-Means clustering identifies dominant colors
- 🏷️ **Color naming** — CSS + XKCD color names using Lab ΔE2000 distance
- 📊 **Percentage coverage** — See how much of each color appears in the image
- 🖱️ **Tap to sample** — Click anywhere on the image to identify colors
- 🎯 **On-image labels** — Toggle visual markers showing color names

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Python FastAPI
- **Image Processing**: Pillow + NumPy + scikit-learn (K-Means) + Lab/ΔE2000
- **Testing**: Vitest + React Testing Library (FE), pytest (BE)
- **Deployment**: Single Docker container with Nginx + FastAPI

## 🚀 Quick Start

> **Want to use ChromaViews?** [Visit the live website](https://chromaviews.com) - no installation needed!
>
> **Want to contribute or run locally?** Follow the instructions below.

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & docker-compose (for production)

### Development

```bash
# Install dependencies and start both servers with hot reload
make dev

# Or manually:
# Terminal 1 - Frontend (http://localhost:5173)
cd frontend && npm install && npm run dev

# Terminal 2 - Backend (http://localhost:8000)
cd backend && pip install -r requirements.txt && uvicorn app:app --reload
```

### Testing

```bash
# Run all tests
make test

# Frontend only
make test-frontend

# Backend only
make test-backend
```

### Production Build

```bash
# Build single Docker image (frontend + backend)
make build

# Run with docker-compose
make up

# Or run directly
make run

# Stop
make down
```

## API Endpoints

### `POST /api/analyze?k=8`

Analyze an image and extract dominant colors.

**Request:**
- `multipart/form-data` with `image` field (JPEG/PNG, max 6 MB)
- Query parameter `k` (3-12, default 8) — number of color clusters

**Response:**
```json
{
  "width": 1280,
  "height": 720,
  "palette": [
    {
      "hex": "#6A8CAF",
      "name": "steel blue",
      "percent": 23.4,
      "rgb": [106, 140, 175],
      "lab": [60.1, -1.2, -20.3]
    }
  ],
  "samples": [
    {
      "x": 312,
      "y": 540,
      "hex": "#C89A3D",
      "name": "mustard"
    }
  ]
}
```

**Example:**
```bash
# Development
curl -X POST "http://localhost:8000/api/analyze?k=8" \
  -F "image=@photo.jpg"

# Production (single container)
curl -X POST "http://localhost/api/analyze?k=8" \
  -F "image=@photo.jpg"
```

### `GET /api/name?hex=FF0000`

Get the nearest color name for a hex value.

**Response:**
```json
{
  "name": "red",
  "deltaE": 0.5
}
```

**Example:**
```bash
# Development
curl "http://localhost:8000/api/name?hex=FF0000"

# Production (single container)
curl "http://localhost/api/name?hex=FF0000"
```

### `GET /healthz`

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Project Structure

```
chromaviews/
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities & API client
│   │   └── App.tsx
│   ├── public/              # Static assets
│   └── package.json
├── backend/
│   ├── app.py               # FastAPI application
│   ├── color_analyzer.py    # K-Means clustering & analysis
│   ├── color_names.py       # Color name database
│   ├── tests/               # pytest tests
│   └── requirements.txt
├── nginx/
│   ├── default.conf         # Nginx config (multi-container)
│   └── single-container.conf # Nginx config (single container)
├── Dockerfile                # Single container with frontend + backend
├── docker-compose.yml
├── Makefile
└── README.md
```

## Configuration

### Frontend Environment Variables

- `VITE_API_BASE` — API base URL (default: `http://localhost:8000`)
- Production (single container): Automatically uses `/api` (proxied by Nginx)

### Backend Environment Variables

- `ALLOWED_ORIGINS` — Comma-separated CORS origins (default: localhost + chromaviews.com)
- `MAX_IMAGE_MB` — Maximum image size in MB (default: 6)
- `BASE_PATH` — API base path (default: `/api`)
- `LOG_LEVEL` — Logging level (default: `info`)

## Deployment

### Production Setup

The project uses a **single Docker container** that serves both frontend and backend:
- Frontend: Served by Nginx at `/`
- Backend API: Proxied by Nginx from `/api` to internal FastAPI server on port 8000
- Supervisor manages both Nginx and uvicorn processes

1. Build the single Docker image:
   ```bash
   make build
   ```

2. Configure environment variables in `docker-compose.yml`:
   - `ALLOWED_ORIGINS`: CORS allowed origins
   - `MAX_IMAGE_MB`: Maximum image size (default: 6)
   - `LOG_LEVEL`: Logging level (default: info)

3. Deploy:
   ```bash
   docker compose up -d
   ```

4. For production deployment at `https://chromaviews.com`:
   - The container exposes port 80
   - Configure a reverse proxy (e.g., Cloudflare, AWS ALB, or another Nginx) to:
     - Handle SSL/TLS termination
     - Proxy to container on port 80
   - Or use `nginx/single-container.conf` as a starting point for a standalone Nginx setup

### SEO & Branding

- Meta tags configured in `frontend/index.html`
- Favicon: `frontend/public/favicon.svg`
- Sitemap: `frontend/public/sitemap.xml`
- Robots.txt: `frontend/public/robots.txt`

## Development Notes

- **Image Resizing**: Images larger than 1280px are automatically resized
- **Color Deduplication**: Colors with ΔE < 5 are merged (keeps higher percentage)
- **Sample Points**: 6×6 grid with 5×5 neighborhood averaging
- **Timeout**: 15 seconds for analysis requests

## 📚 Resources

- **Live Website**: [https://chromaviews.com](https://chromaviews.com)
- **API Documentation**: See [API Endpoints](#api-endpoints) section above

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

**Made with ❤️ for color enthusiasts everywhere**

Visit [chromaviews.com](https://chromaviews.com) to try it out!

