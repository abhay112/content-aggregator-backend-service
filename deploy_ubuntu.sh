#!/bin/bash
# ==============================================================================
# Content Aggregator Backend - Ubuntu Deployment Script
# ==============================================================================
# This script automates the installation and deployment process.
# It handles dependency installation (PostgreSQL, Node.js, PM2), database setup,
# application build, seeding, and process management.
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e
# Treat unset variables as an error when substituting
set -u

# --- Logging Setup ---
LOG_FILE="deploy_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a ${LOG_FILE} )
exec 2> >(tee -a ${LOG_FILE} >&2)

log() {
    echo -e "[\e[32m$(date +'%Y-%m-%dT%H:%M:%S%z')\e[0m] $1"
}

error_handler() {
    echo -e "\e[31m[ERROR] An error occurred on line $1. Deployment aborted.\e[0m"
    echo "Check the log file for details: $(pwd)/${LOG_FILE}"
    echo "Common failure points to check:"
    echo "1. Network connection issues during apt-get or npm operations."
    echo "2. PostgreSQL port (5432) or Node.js port already in use."
    echo "3. Prisma schema errors or missing database configuration."
    exit 1
}

trap 'error_handler $LINENO' ERR

log "Starting deployment of Content Aggregator Backend Service..."

# --- Configuration ---
# WARNING: Change these in a real production environment!
DB_NAME="content_aggregator"
DB_USER="aggregator_user"
DB_PASS="SecurePassword123!"
APP_PORT=6001

if [ "$EUID" -ne 0 ]; then
  log "\e[33mWarning: Please run this script with sudo or as root.\e[0m"
  log "Example: sudo ./deploy_ubuntu.sh"
  exit 1
fi

# ==========================================
# 1. System Updates & Prerequisites
# ==========================================
log "Updating system packages..."
apt-get update -y
apt-get upgrade -y

log "Installing basic dependencies (curl, git, ufw, build-essential)..."
apt-get install -y curl git ufw build-essential

# ==========================================
# 2. Install Node.js (Current LTS - v20)
# ==========================================
if ! command -v node &> /dev/null; then
    log "Node.js not found. Installing Node.js v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    log "Node.js is already installed: $(node -v)"
fi

# ==========================================
# 3. Install & Configure PostgreSQL
# ==========================================
if ! command -v psql &> /dev/null; then
    log "PostgreSQL not found. Installing PostgreSQL..."
    apt-get install -y postgresql postgresql-contrib
else
    log "PostgreSQL is already installed."
fi

log "Ensuring PostgreSQL service is running..."
systemctl enable postgresql
systemctl start postgresql

log "Setting up PostgreSQL database and user..."
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};" || log "Database ${DB_NAME} might already exist. Proceeding..."
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASS}';" || log "User ${DB_USER} might already exist. Proceeding..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" || true
sudo -u postgres psql -d ${DB_NAME} -c "ALTER SCHEMA public OWNER TO ${DB_USER};" || true

# ==========================================
# 4. Project Setup & Environment Configurations
# ==========================================
log "Setting up Application..."

log "Generating .env file..."
cat > .env <<EOF
NODE_ENV=production
PORT=${APP_PORT}
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
CORS_ORIGIN="*"
EOF

# ==========================================
# 5. Application Dependencies & Building
# ==========================================
log "Installing NPM dependencies..."
npm install --omit=dev || npm install

log "Generating Prisma Client..."
npx prisma generate

log "Running Database Migrations..."
npx prisma migrate deploy

log "Executing Data Seed (Sources & Setup)..."
if npm run seed; then
    log "Seeding completed successfully."
else
    log "Seeding via 'npm run seed' failed. Attempting fallback seeding..."
    npx prisma db seed || log "\e[33mWarning: Seed process failed. Please verify database schema and seed script.\e[0m"
fi

if [ -f "tsconfig.json" ] || grep -q 'typescript' package.json; then
    log "Compiling TypeScript... (if applicable)"
    npm run build || log "\e[33mWarning: Build failed. If not using TypeScript or handled differently, disregard.\e[0m"
fi

# ==========================================
# 6. PM2 Setup & Application Startup
# ==========================================
if ! command -v pm2 &> /dev/null; then
    log "Installing PM2 globally..."
    npm install -g pm2
fi

log "Starting application with PM2..."
ENTRY_FILE="index.js"
if [ -f "dist/server.js" ]; then
    ENTRY_FILE="dist/server.js"
elif [ -f "dist/index.js" ]; then
    ENTRY_FILE="dist/index.js"
elif [ -f "src/server.ts" ]; then
    ENTRY_FILE="npm"
fi

pm2 delete "content-aggregator" 2>/dev/null || true

if [ "$ENTRY_FILE" == "npm" ]; then
    pm2 start npm --name "content-aggregator" -- run start
else
    pm2 start $ENTRY_FILE --name "content-aggregator"
fi

log "Saving PM2 process list to auto-start on reboot..."
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 > pm2-startup.sh
chmod +x pm2-startup.sh
./pm2-startup.sh || true
rm pm2-startup.sh

# ==========================================
# 7. Firewall (UFW) Configuration
# ==========================================
log "Configuring firewall (UFW) to allow port ${APP_PORT}..."
ufw allow OpenSSH
ufw allow ${APP_PORT}
ufw --force enable

PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || echo "YOUR_SERVER_IP")

log "====================================================================="
log "Deployment Completed Successfully! 🎉"
log "API should be accessible at: http://${PUBLIC_IP}:${APP_PORT}"
log "====================================================================="
log "IMPORTANT: To connect your Vercel frontend to this backend using the IP,"
log "make sure CORS allows your Vercel URL. Note that browsers may block HTTP"
log "backends from HTTPS frontends (Mixed Content restriction)."
log "See the README for solutions to this issue."
log "====================================================================="
