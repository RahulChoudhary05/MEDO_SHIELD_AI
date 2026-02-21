# NEURO-SHIELD AI

## 🧠 Project Vision

Neuro-Shield AI is a **privacy-first, AI-driven longitudinal neurodegenerative monitoring platform** designed to transform how Parkinson's disease and related neurological disorders are tracked and managed.

### The Problem
Traditional clinical assessments provide only brief, infrequent snapshots of a patient's condition, often missing daily fluctuations in:
- Tremor severity
- Gait instability
- Bradykinesia (slowness of movement)

### The Solution
Neuro-Shield AI leverages **smartphone-based pose estimation**, **edge AI processing**, and **advanced signal analysis** to:
- ✅ **Continuously monitor** neurological motor function without intrusive wearables
- ✅ **Convert video** into numerical skeletal keypoints in real-time
- ✅ **Analyze movement patterns** using AI algorithms
- ✅ **Generate objective risk scores** and longitudinal trends for clinicians
- ✅ **Never store raw video** - preserving privacy by design

---

## 🌟 What's New in the World

### 1. **Passive Smartphone-Based Monitoring**
No wearables, no sensors — only a standard smartphone camera.

### 2. **Privacy-First Architecture**
Raw video is never stored. Converted to skeletal keypoints in real-time and immediately discarded.

### 3. **Personalized AI Baseline Calibration**
System builds a patient-specific movement baseline over time and detects micro-deviations.

### 4. **Longitudinal Neuro-AI Tracking**
Instead of static checkups, the platform builds trend-based intelligence.

### 5. **Sustainable Web Design**
Low-energy UI, optimized assets, accessible interfaces, and ethical UX.

### 6. **3D Immersive Medical Visualization**
Interactive 3D brain model using WebGL/Three.js.

### 7. **AI-Driven Risk Prediction**
Deviation scoring + tremor FFT + gait symmetry → intelligent classification.

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   USER TIER                              │
├─────────────────────────────────────────────────────────┤
│  React Frontend (Port 5173)                              │
│  - 3D Brain Visualization (Three.js)                     │
│  - Video Capture & Processing                           │
│  - Dashboard & Trends                                    │
│  - Responsive UI (Tailwind)                              │
└────────────┬────────────────────────────────────────────┘
             │ HTTP/WebSocket
┌────────────┴────────────────────────────────────────────┐
│              API TIER (FastAPI Port 8000)                │
├─────────────────────────────────────────────────────────┤
│  ✓ Patient Management                                    │
│  ✓ Video Analysis Pipeline                              │
│  ✓ Risk Assessment Engine                               │
│  ✓ JWT Authentication                                    │
│  ✓ Rate Limiting & CORS                                 │
└────────────┬────────────────────────────────────────────┘
             │ Async Motor Driver
┌────────────┴────────────────────────────────────────────┐
│            DATA TIER (MongoDB)                           │
├─────────────────────────────────────────────────────────┤
│  - Patients Collection                                   │
│  - Analysis Sessions (pose frames, features)            │
│  - Baselines (patient-specific metrics)                 │
│  - Risk Assessments (classifications, scores)           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           AI ENGINE (Python Backend)                     │
├─────────────────────────────────────────────────────────┤
│  1. Pose Extraction: MediaPipe (33 keypoints)           │
│  2. Gait Analysis: Stride, Cadence, Symmetry           │
│  3. Tremor Analysis: FFT-based frequency detection      │
│  4. Baseline Learning: Adaptive patient model            │
│  5. Risk Classification: Low/Medium/High                 │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
neuro-shield-ai/
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application
│   │   ├── database.py              # MongoDB connection
│   │   ├── models.py                # Pydantic models
│   │   ├── auth.py                  # JWT authentication
│   │   ├── ai_engine/
│   │   │   ├── pose.py              # MediaPipe pose extraction
│   │   │   ├── gait_analysis.py     # Gait metrics calculation
│   │   │   ├── tremor_analysis.py   # FFT-based tremor detection
│   │   │   ├── baseline.py          # Baseline learning
│   │   │   └── __init__.py
│   │   ├── routers/
│   │   │   ├── patients.py          # Patient endpoints
│   │   │   ├── analysis.py          # Analysis endpoints
│   │   │   └── __init__.py
│   │   └── __init__.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env                         # Environment variables
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── BrainVisualization.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Analysis.jsx
│   │   ├── services/
│   │   │   └── api.js               # Axios API client
│   │   ├── store/
│   │   │   └── store.js             # Zustand state management
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml               # Multi-service orchestration
├── nginx.conf                       # Reverse proxy configuration
├── README.md                        # This file
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose (for containerized setup)
- Python 3.11+ (for local backend development)
- Node.js 18+ (for frontend development)
- MongoDB Atlas account (or local MongoDB)

### Option 1: Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/yourusername/neuro-shield-ai.git
cd neuro-shield-ai

# Start all services
docker-compose up -d

# Services will be available at:
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
# MongoDB: localhost:27017
```

### Option 2: Local Development Setup

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string

# Run backend
uvicorn app.main:app --reload --port 8000
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Access the application at `http://localhost:5173`

---

## ⚙️ Environment Variables

### Backend (.env)
```env
# MongoDB
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/neuro_shield
MONGODB_DB=neuro_shield

# JWT
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False
ENVIRONMENT=production

# CORS
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# AI Configuration
FFT_SAMPLE_RATE=30
BASELINE_SESSIONS=7
DEVIATION_THRESHOLD=2.5
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=NEURO-SHIELD AI
VITE_APP_VERSION=1.0.0
```

---

## 📡 API Documentation

### Authentication Endpoints

#### Register Patient
```http
POST /api/patients/register
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "user_id": "patient_12345",
  "date_of_birth": "1960-05-15",
  "gender": "M"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Login
```http
POST /api/patients/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Analysis Endpoints

#### Upload Analysis Session
```http
POST /api/analysis/upload-session
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "patient_id": "507f1f77bcf86cd799439011",
  "video_duration": 10.5,
  "frame_count": 315,
  "pose_frames": [
    {
      "frame_number": 0,
      "timestamp": 0.0,
      "keypoints": [[0.5, 0.3, 0.1], ...33 keypoints],
      "confidence": 0.87
    }
    ...
  ]
}

Response:
{
  "_id": "507f1f77bcf86cd799439012",
  "patient_id": "507f1f77bcf86cd799439011",
  "features": {
    "stride_length": 0.65,
    "cadence": 95.3,
    "gait_symmetry": 0.78,
    "tremor_frequency": 5.2,
    "tremor_amplitude": 0.12,
    "bradykinesia_score": 0.45,
    "deviation_from_baseline": 1.2
  },
  "created_at": "2024-02-19T10:30:00Z",
  "risk_classification": "LOW"
}
```

#### Get Risk History
```http
GET /api/analysis/risk-history/{patient_id}?limit=50
Authorization: Bearer {access_token}

Response:
{
  "patient_id": "507f1f77bcf86cd799439011",
  "assessments": [
    {
      "id": "507f1f77bcf86cd799439012",
      "session_id": "507f1f77bcf86cd799439013",
      "risk_classification": "LOW",
      "risk_score": 1.2,
      "confidence": 0.95,
      "flagged": false,
      "created_at": "2024-02-19T10:30:00Z"
    }
  ]
}
```

---

## 🧠 AI Pipeline Explanation

### 1. Pose Extraction (MediaPipe)
- Extracts **33 skeletal keypoints** from video frames
- Returns (x, y, z) coordinates + visibility confidence for each joint
- Runs in real-time at 30 FPS

### 2. Gait Analysis
**Stride Length**: Distance between consecutive ankle positions
```
stride_length = distance(left_ankle[t=0], left_ankle[t=stride_period])
```

**Cadence**: Steps per minute
```
cadence = (number_of_steps / total_duration) * 60
```

**Gait Symmetry**: Left-right balance (0-1)
```
symmetry = 1 - (|left_distance - right_distance| / max(left_distance, right_distance))
```

### 3. Tremor Analysis (FFT)
- Extract wrist oscillation sequences
- Apply Hann window to reduce spectral leakage
- Compute FFT to identify dominant frequency
- Detect Parkinson's tremor range (4-12 Hz)

```python
# Tremor detection
oscillations = extract_oscillation_sequence(wrist_positions)
windowed = oscillations * hann_window
fft_result = fft(windowed)
tremor_freq = frequency_with_max_magnitude(fft_result[4-12Hz])
```

### 4. Bradykinesia Scoring
Movement velocity-based metric (0-1, where 1 = complete slowness)
```
mean_velocity = avg_joint_velocity_across_frames
bradykinesia = 1.0 / (1.0 + normalized_velocity)
```

### 5. Baseline & Risk Scoring
**Baseline Creation** (first 7 sessions):
```
baseline = {
  stride_length_mean: mean(sessions[0:7]),
  stride_length_std: std(sessions[0:7]),
  gait_symmetry_mean: mean(sessions[0:7]),
  ...
}
```

**Deviation Score** (z-score based):
```
deviation = mean_zscore([
  |current_symmetry - baseline_symmetry| / baseline_std,
  |current_bradykinesia - baseline_bradykinesia| / baseline_std,
  ...
])
```

**Risk Classification**:
- **LOW**: deviation < 1.5
- **MEDIUM**: 1.5 ≤ deviation < 3.0
- **HIGH**: deviation ≥ 3.0

---

## 🔒 Security & Privacy

### Privacy-First Design
✅ **No Raw Video Storage**: Video is processed locally in the browser and on edge, never sent to servers
✅ **Numerical Features Only**: Only 33 keypoints per frame stored in database
✅ **GDPR Compliant**: User can request data deletion
✅ **Encrypted Transmission**: All API endpoints use HTTPS
✅ **Row-Level Security**: Users can only access their own data

### Security Measures
✅ **JWT Authentication**: Secure token-based authentication
✅ **Password Hashing**: bcrypt with salt for password security
✅ **CORS Protection**: Restricted cross-origin requests
✅ **Rate Limiting**: Prevents brute-force attacks
✅ **Input Validation**: Pydantic validation on all endpoints
✅ **SQL Injection Prevention**: Parameterized MongoDB queries
✅ **HTTP-Only Cookies**: Secure session management (optional)

---

## 📊 Monitoring & Analytics

### Key Metrics Tracked
1. **Gait Symmetry**: Balance between left and right movement
2. **Cadence**: Walking speed (steps/minute)
3. **Stride Length**: Distance covered per step
4. **Tremor Frequency**: Hz (dominant oscillation frequency)
5. **Tremor Amplitude**: Magnitude of oscillation
6. **Bradykinesia Score**: Slowness of movement (0-1)
7. **Risk Level**: Classification based on deviation

### Longitudinal Trends
- 30-day rolling averages
- Trend detection (improving/declining)
- Anomaly alerts for sudden changes
- Clinician-facing risk flags

---

## 🚢 Deployment

### Deploy to Render (Backend)
```bash
# Create render.yaml
services:
  - type: web
    name: neuro-shield-backend
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port 8000
    envVars:
      - key: MONGODB_URL
        value: your_mongodb_atlas_url
```

### Deploy to Vercel (Frontend)
```bash
# Connect GitHub repository
# Push to main branch
# Vercel auto-deploys on push
```

### With Docker
```bash
# Build images
docker build -t neuro-shield-backend ./backend
docker build -t neuro-shield-frontend ./frontend

# Push to registry
docker push your-registry/neuro-shield-backend
docker push your-registry/neuro-shield-frontend

# Deploy using docker-compose or Kubernetes
```

---

## 🔄 Continuous Integration/Deployment

### GitHub Actions Example
```yaml
name: Deploy NEURO-SHIELD

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run backend tests
        run: cd backend && pip install -r requirements.txt && pytest
      - name: Build frontend
        run: cd frontend && npm install && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        run: curl ${{ secrets.RENDER_WEBHOOK }}
```

---

## 📈 Future Roadmap

### Phase 2 (Q2 2024)
- [ ] Mobile app (iOS/Android)
- [ ] Wearable sensor integration
- [ ] Advanced video processing (edge deployment)
- [ ] Clinician dashboard with patient management
- [ ] Real-time notifications for risk changes

### Phase 3 (Q3 2024)
- [ ] Machine learning model improvements
- [ ] Integration with EHR systems
- [ ] Telemedicine capabilities
- [ ] Multi-language support
- [ ] Advanced analytics & reporting

### Phase 4 (Q4 2024)
- [ ] FDA/CE Mark regulatory approval
- [ ] Insurance integration
- [ ] International deployment
- [ ] Research partnerships

---

## 📚 Tech Stack

### Backend
- **Framework**: FastAPI
- **ORM**: Motor (async MongoDB driver)
- **Auth**: JWT + bcrypt
- **AI/ML**: MediaPipe, NumPy, SciPy, scikit-learn
- **Video**: OpenCV
- **Server**: Uvicorn

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI**: Framer Motion (animations)
- **Charts**: Recharts
- **3D**: Three.js + React Three Fiber
- **State**: Zustand
- **API**: Axios

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose, Kubernetes (optional)
- **Reverse Proxy**: Nginx
- **Database**: MongoDB Atlas
- **Deployment**: Vercel, Render, AWS

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 📞 Support & Contact

- **Issues**: GitHub Issues
- **Email**: support@neuro-shield.ai
- **Documentation**: https://docs.neuro-shield.ai
- **Community**: Discord/Slack community

---

## ⚠️ Disclaimer

NEURO-SHIELD AI is a research and monitoring tool. It is **not** a diagnostic device and should **not** be used as a replacement for professional medical diagnosis or treatment. Always consult with healthcare providers for medical advice.

---

**Built with ❤️ for better neurological health outcomes**

**Last Updated**: February 2024
**Version**: 1.0.0
