#!/usr/bin/env bash
# ==============================================================================
# Setup script for RS PRO C100 (NVIDIA Jetson Nano)
# Run on the Jetson Nano to configure Python environment and systemd service.
# ==============================================================================

set -e

echo "=== [NutriFit] Initializing RS PRO C100 Edge Node Setup ==="

# Check architecture
ARCH=$(uname -m)
echo "Detected architecture: $ARCH"

# Install python3-pip and python3-venv if missing
echo "Ensuring python3-pip and python3-venv are installed..."
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv python3-distutils

# Create virtual environment with system site-packages (to use JetPack PyTorch/Torchvision)
VENV_DIR="$HOME/nutrifit_edge_venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment with system site-packages at $VENV_DIR..."
    python3 -m venv --system-site-packages "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

echo "Installing edge dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create systemd service for automatic startup on boot
SERVICE_FILE="/etc/systemd/system/nutrifit-edge.service"
CURRENT_DIR=$(pwd)
CURRENT_USER=$(whoami)

echo "Configuring systemd service..."
sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=NutriFit RS PRO C100 Edge Inference Service
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=$VENV_DIR/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1
Environment=EDGE_DEVICE=cuda:0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable nutrifit-edge.service

echo ""
echo "=== Setup Complete! ==="
echo "To start the service now, run: sudo systemctl start nutrifit-edge.service"
echo "To check service status:       sudo systemctl status nutrifit-edge.service"
echo "To test manually:              uvicorn main:app --host 0.0.0.0 --port 8000"
