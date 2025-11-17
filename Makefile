.PHONY: help setup dev clean docker-up docker-down docker-logs db-push db-seed db-studio db-reset

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Complete setup (Docker + DB + Seed)
	@echo "🚀 Setting up bowling tournament manager..."
	@npm run docker:up
	@echo "⏳ Waiting for database to be ready..."
	@sleep 5
	@npm run db:push
	@npm run db:seed
	@echo "✅ Setup complete! Run 'make dev' to start the app"

dev: ## Start development server
	npm run dev

clean: ## Stop Docker and clean up
	npm run docker:down
	docker-compose down -v

docker-up: ## Start PostgreSQL container
	npm run docker:up

docker-down: ## Stop PostgreSQL container
	npm run docker:down

docker-logs: ## View PostgreSQL logs
	npm run docker:logs

db-push: ## Push database schema
	npm run db:push

db-seed: ## Seed database with sample data
	npm run db:seed

db-studio: ## Open Prisma Studio
	npm run db:studio

db-reset: ## Reset database
	npm run db:reset

install: ## Install dependencies
	npm install

build: ## Build for production
	npm run build
