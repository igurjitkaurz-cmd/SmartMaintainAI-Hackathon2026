# SmartMaintainAI — Machine Learning Predictive Maintenance System

SmartMaintainAI is an end-to-end industrial predictive maintenance platform that integrates high-frequency CNC milling telemetry with a machine learning classification engine. It forecasts potential equipment breakdowns, diagnoses thermodynamic and mechanical failure mechanisms, and recommends timely maintenance before costly factory downtime occurs.

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│               SmartMaintainAI Architecture             │
└────────────────────────────────────────────────────────┘

    [ React + Vite Frontend (Port 5173) ]
       │
       ├── Landing Page (/)
       ├── Dashboard (/dashboard) with Recharts Visualizations
       ├── Machine Fleet (/machines) & Registration (/machines/add)
       ├── Telemetry Analysis (/analysis) & Inference Form
       ├── Prediction Detail (/predictions/:id) with Gauge & Radar
       └── Authentication (/login & /register)
       │
       │ HTTP / JSON (Axios withCredentials: true)
       ▼
    [ Python Flask REST API (Port 5000) ]
       │
       ├── GET  /api/health
       ├── POST /api/predict
       ├── GET  /api/machines
       ├── POST /api/machines
       ├── GET  /api/dashboard/stats
       └── POST /api/auth/{register, login, logout, me}
       │
       ├── [ Random Forest Model ] (models/machine_failure_model.pkl)
       │     └── 200 Trees, 8-Dimensional Input Vector
       │
       └── [ SQLite Database ] (smartmaintain.db)
             ├── users (id, username, password_hash, created_at)
             └── machines (id, user_id, machine_name, machine_type,
                           air_temp, proc_temp, speed, torque, wear...)
```

---

## Machine Learning Pipeline & Dataset

- **Model**: Scikit-Learn `RandomForestClassifier(n_estimators=200, random_state=42)`
- **Dataset**: AI4I 2020 Predictive Maintenance Dataset (10,000 synthetic machine operational records reflecting real milling equipment).
- **Features Evaluated (8 total)**:
  1. `Air temperature [K]`: Ambient room temperature ($295.0\text{ K} - 304.5\text{ K}$)
  2. `Process temperature [K]`: Heat generated during cutting ($305.0\text{ K} - 314.0\text{ K}$)
  3. `Rotational speed [rpm]`: Spindle rotation speed ($1168 - 2886\text{ RPM}$)
  4. `Torque [Nm]`: Resistance / cutting load ($3.8 - 76.6\text{ Nm}$)
  5. `Tool wear [min]`: Cumulative cutter contact time ($0 - 253\text{ min}$)
  6. `Type_H`: High quality variant indicator (1 or 0)
  7. `Type_L`: Low quality variant indicator (1 or 0)
  8. `Type_M`: Medium quality variant indicator (1 or 0)
- **Predictions**:
  - Class `0`: Optimal / No Failure Predicted
  - Class `1`: Failure Risk Predicted
  - **Probability Score**: Statistical decision tree ensemble probability ($0.0\% - 100.0\%$)
  - **Diagnostics Modes**:
    - **TWF** (Tool Wear Failure): Wear $\ge 200\text{ min}$
    - **HDF** (Heat Dissipation Failure): Temperature differential $\Delta T < 8.6\text{ K}$ and Speed $< 1380\text{ RPM}$
    - **PWF** (Power Failure): Power product $P < 3500\text{ W}$ or $P > 9000\text{ W}$
    - **OSF** (Overstrain Failure): Product of tool wear and torque exceeds variant threshold

---

## Quick Start: How to Run the Project

### Prerequisites
- Python 3.9+ with `pip`
- Node.js 18+ and `npm`

---

### Step 1: Start the Backend (Flask REST API)

1. Open a terminal in the `SmartmaintainAI` directory:
   ```bash
   cd SmartmaintainAI
   ```

2. (Optional) Activate your Python virtual environment if you use one.

3. Install backend dependencies (if not already installed):
   ```bash
   pip install flask flask-cors scikit-learn pandas numpy joblib
   ```

4. Run the automated test suite to verify the model and all API routes:
   ```bash
   python test_api.py
   ```
   *(All 9 tests will report `OK`)*

5. Start the Flask server:
   ```bash
   python app.py
   ```
   The Flask API will start at **`http://127.0.0.1:5000`** (and `http://localhost:5000`) with CORS enabled.
   Health check URL: **`http://127.0.0.1:5000/api/health`**

---

### Step 2: Start the Frontend (React + Vite)

1. Open a second terminal in the `frontend/frontend` directory:
   ```bash
   cd frontend/frontend
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *(Or on Windows PowerShell: `npm.cmd run dev`)*

3. Open your browser and navigate to:
   **`http://localhost:5173`**

---

## Application Tour

1. **Landing Page (`http://localhost:5173/`)**:
   - Project overview, technical specifications, live telemetry preview, and platform capabilities.
2. **User Authentication (`/login` & `/register`)**:
   - Register or sign in to your plant operator account (backed by SQLite session auth).
3. **Control Center Dashboard (`/dashboard`)**:
   - Fleet health distribution donut chart (Recharts).
   - Machine variant breakdown bar chart (Types L, M, H).
   - Cutting torque and cumulative tool wear comparison across machines.
   - Severity risk tier classification (Low, Warning, Critical) and telemetry averages.
   - Live registered fleet listing.
4. **Machine Fleet Management (`/machines` & `/machines/add`)**:
   - Register new CNC machines with live baseline parameters.
   - View detailed parameters and instant model scoring.
5. **Machine Analysis & Diagnostics (`/analysis`)**:
   - Enter machine operating parameters to evaluate failure probability.
   - Click **Run Machine Diagnostics** to receive real-time predictions from `RandomForestClassifier`.
6. **Detailed Prediction Output (`/predictions/:id`)**:
   - Semicircular failure probability gauge ($0\% - 100\%$).
   - 5-axis normalized parameter stress radar chart.
   - Physics-informed failure modes breakdown (TWF, HDF, PWF, OSF).
   - Specific maintenance recommendations.

---

## Backend Test Suite

To verify backend integrity at any time:
```bash
cd SmartmaintainAI
python test_api.py
```
This runs 9 automated unit tests verifying:
- `/api/health` and model loading
- Safe / nominal parameter predictions
- Extreme parameter failure predictions
- High temperature differential physics checks
- Input validation and boundary error handling
- Type variant one-hot encoding
- Full user registration, session authentication, and machine persistence lifecycle
- Fleet summary statistics calculation (`/api/dashboard/stats`)
- CORS header configuration

