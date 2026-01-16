.PHONY: help dev build test lint migrate seed clean logs shell-api shell-db stop

# Development compose file
COMPOSE_DEV = docker-compose -f docker-compose.dev.yml

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	$(COMPOSE_DEV) up --build

dev-detach: ## Start development environment in background
	$(COMPOSE_DEV) up --build -d

dev-tools: ## Start development environment with adminer
	$(COMPOSE_DEV) --profile tools up --build

build: ## Build development images
	$(COMPOSE_DEV) build

stop: ## Stop all containers
	$(COMPOSE_DEV) down

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
	$(COMPOSE_DEV) exec api ./migrate up

migrate-down: ## Rollback last migration
	$(COMPOSE_DEV) exec api ./migrate down 1

seed: ## Seed test data
	$(COMPOSE_DEV) exec api ./seed

clean: ## Clean up containers and volumes
	$(COMPOSE_DEV) down -v --remove-orphans

logs: ## View container logs
	$(COMPOSE_DEV) logs -f

logs-api: ## View API logs only
	$(COMPOSE_DEV) logs -f api

shell-api: ## Shell into API container
	$(COMPOSE_DEV) exec api sh

shell-db: ## Shell into database
	$(COMPOSE_DEV) exec db psql -U wellf

setup: ## Initial project setup
	cp .env.example .env
	@echo "Please edit .env with your configuration"

# Production commands
prod: ## Start production environment with Cloudflare tunnel
	docker-compose -f docker-compose.prod.yml up --build -d

prod-logs: ## View production logs
	docker-compose -f docker-compose.prod.yml logs -f

prod-stop: ## Stop production environment
	docker-compose -f docker-compose.prod.yml down

prod-restart: ## Restart production environment
	docker-compose -f docker-compose.prod.yml down
	docker-compose -f docker-compose.prod.yml up --build -d

prod-backup: ## Backup production database
	@mkdir -p backups
	docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U $${DB_USER:-wellf} $${DB_NAME:-wellf} > backups/wellf-$$(date +%Y%m%d-%H%M%S).sql
	@echo "Backup saved to backups/"

prod-shell-db: ## Shell into production database
	docker-compose -f docker-compose.prod.yml exec db psql -U $${DB_USER:-wellf}
