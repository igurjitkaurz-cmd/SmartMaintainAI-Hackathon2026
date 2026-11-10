# SmartMaintainAI
### AI-Powered Predictive Maintenance System for Small Manufacturing Units

SmartMaintainAI is an AI-powered predictive maintenance web application designed to help small manufacturing units monitor their machines and identify potential failures before they happen.

The system uses Machine Learning to analyze machine operating parameters, predict failure risks, and provide maintenance insights. It also supports multiple users and machine management, allowing each registered user to manage their own machines.

## 🚀 Problem Statement

Unexpected machine failures can cause production delays, financial losses, and increased maintenance costs. Small manufacturing units often lack access to advanced predictive maintenance solutions.

SmartMaintainAI aims to make predictive maintenance more accessible, affordable, and easier to use through an AI-based web application.

## ✨ Key Features

- **User Authentication:** Secure user registration and login.
- **Multi-Machine Management:** Add and manage multiple machines.
- **AI-Based Failure Prediction:** Predict possible machine failures using a trained Machine Learning model.
- **Risk Assessment:** Identify machine failure risk based on operating parameters.
- **Maintenance Insights:** Help users understand potential maintenance requirements.
- **Personalized Dashboard:** Display machine information and predictions for the logged-in user.
- **Data Visualization:** Present machine-related information in an organized dashboard.

## 🧠 Machine Learning Model

The project uses a Random Forest Classifier for machine failure prediction.

**Model Configuration:**
- Algorithm: Random Forest Classifier
- Number of Estimators: 200
- Minimum Samples per Leaf: 2
- Class Weight: Balanced
- Random State: 42

**Input Features:**
- Air Temperature
- Process Temperature
- Rotational Speed
- Torque
- Tool Wear
- Machine Type (H, L, M)

**Model Evaluation Results:**

| Metric | Score |
|---|---:|
| Accuracy | 97.40% |
| Precision | 58.89% |
| Recall | 77.94% |
| F1-Score | 67.09% |

These are the results from the model's evaluation on the selected test split.

## 📊 Dataset

We used the **AI4I 2020 Predictive Maintenance Dataset** from the UCI Machine Learning Repository.

Dataset Link: https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset

The dataset contains machine operating parameters and failure-related information used to train and evaluate the predictive model.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js |
| Build Tool | Vite |
| Backend | Python, Flask |
| Machine Learning | Scikit-learn |
| Database | SQLite |
| Data Processing | Pandas, NumPy |
| Data Visualization | Matplotlib, Seaborn |
| Model Storage | Pickle |

## 📁 Project Structure

```text
SmartMaintainAI/
│
├── data/
│   ├── ai4i2020 (1).csv
│   └── cleaned_data.csv
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── models/
│   └── machine_failure_model.pkl
│
├── app.py
├── data_cleaning.py
├── data_exploration.py
├── data_visualization.py
├── train_model.py
├── test_model.py
├── .gitignore
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/igurjitkaurz-cmd/SmartMaintainAI-Hackathon2026.git
```

### 2. Navigate to the Project Folder

```bash
cd SmartMaintainAI-Hackathon2026
```

### 3. Start the Backend

Open a terminal:

```bash
cd SmartmaintainAI
```

Install the required Python packages:

```bash
pip install flask flask-cors pandas numpy scikit-learn joblib
```

Start the Flask server:

```bash
python app.py
```

The backend will run at:

`http://localhost:5000`

### 4. Start the Frontend

Open another terminal in the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

**Note:** If your local folder structure differs from the repository structure shown above, adjust the commands accordingly. Configure the frontend API URL to point to the Flask backend.

## 🔗 Main Backend API Endpoints

| Endpoint | Purpose |
|---|---|
| `/api/health` | Check backend and model status |
| `/api/auth/register` | Register a new user |
| `/api/auth/login` | User login |
| `/api/auth/logout` | User logout |
| `/api/auth/me` | Get logged-in user information |
| `/api/machines` | Manage user machines |
| `/api/predict` | Predict machine failure |
| `/api/dashboard/stats` | Retrieve dashboard statistics |

## 🎯 Project Objective

Our goal is to help small manufacturing units move from reactive maintenance to predictive maintenance by using Machine Learning.

SmartMaintainAI aims to reduce unexpected downtime, improve machine monitoring, and support better maintenance decisions.

## 👥 Team Members

| Name | GitHub Profile |
|---|---|
| Gurjit Kaur | [@igurjitkaurz-cmd](https://github.com/igurjitkaurz-cmd) |
| Vanisha | [@vanishav143-rgb](https://github.com/vanishav143-rgb) |
| Pushtum | [@pushtam0234-afk](https://github.com/pushtam0234-afk) |
| Anshdeep Singh | [@singhanshdeep2707-bit](https://github.com/singhanshdeep2707-bit) |
| Harmeet Singh | [@harryx315](https://github.com/harryx315) |
| Harjap | [@Harjap-kaur](https://github.com/Harjap-kaur) |

## 🏆 Hackathon Project

**Project Name:** SmartMaintainAI  
**Theme:** Predictive Maintenance for Small Manufacturing Units

Built with teamwork, innovation, and the power of Artificial Intelligence.

---

⭐ If you find this project interesting, consider giving the repository a star!