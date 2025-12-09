.PHONY: clean install up seed

# Remove generated assets and dependencies
clean:
	@echo "Cleaning backend/admin_dashboard node_modules and Flutter build artifacts..."
	rm -rf backend/node_modules admin_dashboard/node_modules
	rm -rf admin_dashboard/.next admin_dashboard/.turbo
	cd backend && rm -rf build dist || true
	cd admin_dashboard && rm -rf build || true
	flutter clean || true

# Install JavaScript dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing admin_dashboard dependencies..."
	cd admin_dashboard && npm install

# Run backend API then admin dashboard (dev mode)
up:
	@echo "Starting backend API..."
	cd backend && npm start &
	@sleep 2
	@echo "Starting admin dashboard..."
	cd admin_dashboard && npm run dev

# Seed database with sample data
seed:
	cd backend && node src/utils/seed.js
