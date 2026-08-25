.PHONY: up down build logs test test-backend test-frontend test-docker fmt clean

up: backend/.env frontend/.env
	docker compose up --build

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

backend/.env:
	cp backend/.env.example backend/.env

frontend/.env:
	cp frontend/.env.example frontend/.env

test: test-backend test-frontend

test-backend:
	cd backend && go vet ./... && go test ./... -cover

test-frontend:
	cd frontend && npm run lint && npm run test:coverage && npm run build

# Production images are stripped of toolchain and source (see README), so
# tests run against each Dockerfile's builder stage instead of `docker exec`
# into the running container.
test-docker:
	docker build --target builder -t calc-backend-builder ./backend
	docker run --rm calc-backend-builder go test ./... -cover
	docker build --target builder -t calc-frontend-builder ./frontend
	docker run --rm calc-frontend-builder npm run lint
	docker run --rm calc-frontend-builder npm run test:coverage

fmt:
	cd backend && gofmt -w .
	cd frontend && npm run format

clean:
	docker compose down -v --remove-orphans
	rm -f backend/.env frontend/.env
