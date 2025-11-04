.PHONY: dev test build up down install-frontend install-backend

dev:
	@echo "Starting development servers..."
	@cd frontend && npm install && npm run dev &
	@cd backend && pip install -r requirements.txt && uvicorn app:app --host 0.0.0.0 --port 8000 --reload &
	@wait

install-frontend:
	@cd frontend && npm install

install-backend:
	@cd backend && pip install -r requirements.txt

test:
	@echo "Running tests..."
	@cd frontend && npm test -- --run
	@cd backend && pytest tests/ -v

test-frontend:
	@cd frontend && npm test -- --run

test-backend:
	@cd backend && pytest tests/ -v

build:
	@echo "Building single Docker image..."
	@docker build --platform linux/amd64 -f Dockerfile -t chromaviews:linux .

up:
	@docker compose up -d

down:
	@docker compose down -v

run:
	@echo "Building and running single container..."
	@docker build -f Dockerfile -t chromaviews .
	@docker run -p 80:80 --rm chromaviews

clean:
	@echo "Cleaning..."
	@cd frontend && rm -rf node_modules dist
	@cd backend && find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete

