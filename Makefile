.PHONY: help dev build test lint migrate seed clean logs shell-api shell-db stop

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	docker-compose up --build

dev-detach: ## Start development environment in background
	docker-compose up --build -d

build: ## Build production images
	docker-compose build

stop: ## Stop all containers
	docker-compose down

test: ## Run all tests
	cd api && go test -v -cover ./...
	cd frontend && npm test

test-api: ## Run API tests only
	cd api && go test -v -cover ./...

test-frontend: ## Run frontend tests only
	cd frontend && npm test

test-e2e: ## Run E2E tests
	cd frontend && npm run test:e2e

lint: ## Run linters
	cd api && golangci-lint run
	cd frontend && npm run lint

migrate: ## Run database migrations
	docker-compose exec api ./migrate up

migrate-down: ## Rollback last migration
	docker-compose exec api ./migrate down 1

seed: ## Seed test data
	docker-compose exec api ./seed

clean: ## Clean up containers and volumes
	docker-compose down -v --remove-orphans

logs: ## View container logs
	docker-compose logs -f

logs-api: ## View API logs only
	docker-compose logs -f api

shell-api: ## Shell into API container
	docker-compose exec api sh

shell-db: ## Shell into database
	docker-compose exec db psql -U wellf

setup: ## Initial project setup
	cp .env.example .env
	@echo "Please edit .env with your configuration"
