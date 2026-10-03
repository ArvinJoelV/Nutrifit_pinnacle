# RS PRO C100 (NVIDIA Jetson Nano) Edge Node Service

This microservice runs on the **RS PRO C100** (NVIDIA Jetson Nano Developer Kit). It offloads the compute-intensive vision tasks (YOLOv8 Detection, MobileSAM/FastSAM Segmentation, Monocular Depth, and 3D Volumetric Integration) from the main NutriFit application onto the Jetson's dedicated 128-core Maxwell GPU.

---

## 1. Quick Start on RS PRO C100

### Step 1: Copy the `edge_node` folder to your C100
From your workstation, copy this directory over SSH or a USB drive:
```bash
scp -r edge_node jetson@<C100_IP_ADDRESS>:~/
```

### Step 2: Run Setup Script
SSH into the C100 and execute the setup script:
```bash
ssh jetson@<C100_IP_ADDRESS>
cd ~/edge_node
chmod +x setup_jetson.sh
./setup_jetson.sh
```

### Step 3: Start Service
Start the systemd daemon:
```bash
sudo systemctl start nutrifit-edge.service
sudo systemctl status nutrifit-edge.service
```

Or test manually in foreground:
```bash
source ~/nutrifit_edge_venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 2. Connecting NutriFit Backend to C100

In your NutriFit backend `.env` file, configure:
```env
EDGE_NODE_ENABLED=true
EDGE_NODE_URL=http://<C100_IP_ADDRESS>:8000
EDGE_NODE_TIMEOUT_SECONDS=15
EDGE_NODE_FALLBACK_TO_LOCAL=true
```

---

## 3. Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Heartbeat & hardware telemetry (GPU, RAM, thermals) |
| `GET` | `/v1/info` | Node capabilities and supported model formats |
| `POST` | `/v1/portion/process` | Processes multipart meal image $\rightarrow$ outputs 3D mass + trace |

---

## 4. Automatic Local Fallback

If the C100 is turned off, rebooting, or disconnected from the network, the NutriFit backend automatically routes vision inference through the local pipeline without interrupting user meal logging.
