#!/usr/bin/env bash
# =============================================================================
# NutriFit AWS EC2 Bootstrap & Deployment Script
# Target OS: Ubuntu 22.04 LTS / Debian 12
# =============================================================================
set -euo pipefail

echo "=========================================="
echo " 🚀 Provisioning NutriFit on AWS EC2..."
echo "=========================================="

# 1. Update system packages
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker Engine..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$USER"
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "Docker installed successfully."
fi

# 3. Clone / Update Repository
APP_DIR="/home/ubuntu/Nutrifit_pinnacle"
if [ ! -d "$APP_DIR" ]; then
    echo "Cloning NutriFit repository..."
    git clone https://github.com/ArvinJoelV/Nutrifit_pinnacle.git "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main

# 4. Check Environment File
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env template..."
    cat << 'EOF' > backend/.env
PORT=9510
REDIS_URL=redis://redis:6379/0
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
EDGE_NODE_ENABLED=false
# Provide your Google API key for Gemini validation:
GOOGLE_API_KEY=
GOOGLE_PROJECT_ID=
GEMINI_MODEL=gemini-2.5-flash
EOF
    echo "⚠️ Please edit $APP_DIR/backend/.env with your GOOGLE_API_KEY before starting."
fi

# 5. Launch containers with Docker Compose
echo "Starting multi-container architecture (Redis + Kafka + Backend + Frontend)..."
docker compose down || true
docker compose up -d --build

echo "=========================================="
echo " ✅ NutriFit deployed successfully on AWS EC2!"
echo " Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):80"
echo " Backend API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):9510/api/health"
echo "=========================================="
