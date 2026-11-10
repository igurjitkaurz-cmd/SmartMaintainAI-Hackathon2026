import math
import sqlite3
from pathlib import Path

import itsdangerous
import joblib
import pandas as pd

from flask import (
    Flask,
    request,
    redirect,
    url_for,
    session,
    render_template_string,
    flash,
    jsonify
)
from werkzeug.security import generate_password_hash, check_password_hash


# --------------------------------------------------
# 1. APP CONFIGURATION
# --------------------------------------------------

app = Flask(__name__)
app.secret_key = "smartmaintainai_change_this_secret_key"
app.url_map.strict_slashes = False
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False
app.config["SESSION_COOKIE_HTTPONLY"] = False

BASE_DIR = Path(__file__).resolve().parent
DB_NAME = BASE_DIR / "smartmaintain.db"
MODEL_PATH = BASE_DIR / "models" / "machine_failure_model.pkl"


# --------------------------------------------------
# 2. LOAD TRAINED AI MODEL
# --------------------------------------------------

saved_data = joblib.load(MODEL_PATH)

model = saved_data["model"]
feature_columns = saved_data["feature_columns"]

print("SmartMaintainAI AI Model Loaded Successfully!")


# --------------------------------------------------
# 3. DATABASE CONNECTION
# --------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


# --------------------------------------------------
# 4. CREATE DATABASE TABLES
# --------------------------------------------------

def init_db():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS machines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            machine_name TEXT NOT NULL,
            machine_type TEXT NOT NULL,
            air_temperature REAL NOT NULL,
            process_temperature REAL NOT NULL,
            rotational_speed REAL NOT NULL,
            torque REAL NOT NULL,
            tool_wear REAL NOT NULL,
            FOREIGN KEY (owner_id) REFERENCES users(id)
        )
    """)

    # Safe migration: ensure optional hardware metadata columns exist
    cursor = conn.execute("PRAGMA table_info(machines)")
    existing_cols = {col[1] for col in cursor.fetchall()}
    extra_columns = [
        ("manufacturer", "TEXT"),
        ("model_number", "TEXT"),
        ("location", "TEXT"),
        ("installation_year", "INTEGER"),
        ("description", "TEXT"),
        ("created_at", "TEXT")
    ]
    for col_name, col_type in extra_columns:
        if col_name not in existing_cols:
            conn.execute(f"ALTER TABLE machines ADD COLUMN {col_name} {col_type}")

    conn.commit()
    conn.close()


# --------------------------------------------------
# 5. AI PREDICTION FUNCTION
# --------------------------------------------------

def predict_machine(machine):
    air_temp_val = float(machine["air_temperature"])
    proc_temp_val = float(machine["process_temperature"])
    speed_val = float(machine["rotational_speed"])
    torque_val = float(machine["torque"])
    tool_wear_val = float(machine["tool_wear"])
    m_type = str(machine["machine_type"]).strip().upper()

    machine_data = {
        "Air temperature [K]": air_temp_val,
        "Process temperature [K]": proc_temp_val,
        "Rotational speed [rpm]": speed_val,
        "Torque [Nm]": torque_val,
        "Tool wear [min]": tool_wear_val,
        "Type_H": 1 if m_type == "H" else 0,
        "Type_L": 1 if m_type == "L" else 0,
        "Type_M": 1 if m_type == "M" else 0
    }

    input_df = pd.DataFrame([machine_data])
    input_df = input_df[feature_columns]

    prediction = int(model.predict(input_df)[0])

    probability = None

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(input_df)[0]
        classes = list(model.classes_)

        if 1 in classes:
            failure_index = classes.index(1)
            probability = float(
                probabilities[failure_index]
            ) * 100

    if prediction == 1:
        suggestion = (
            "Arrange an urgent maintenance inspection. Review telemetry sensor "
            "readings and investigate potential mechanical or thermal faults. "
            "Verify operating conditions before continuing full-load cycles."
        )
    else:
        suggestion = (
            "Continue routine operational monitoring and adhere to standard "
            "servicing intervals. All operating telemetry parameters currently "
            "indicate nominal operating conditions."
        )

    # --------------------------------------------------
    # AI4I Failure Modes Diagnostics
    # --------------------------------------------------
    # 1. TWF: Tool Wear Failure (nominal limit ~200 minutes)
    twf_risk = "CRITICAL" if tool_wear_val >= 200 else ("WARNING" if tool_wear_val >= 180 else "NORMAL")

    # 2. HDF: Heat Dissipation Failure (differential < 8.6 K at low spindle speed < 1380 RPM)
    temp_diff = proc_temp_val - air_temp_val
    hdf_risk = "CRITICAL" if (temp_diff < 8.6 and speed_val < 1380) else ("WARNING" if temp_diff < 8.6 else "NORMAL")

    # 3. PWF: Power Failure (Power < 3500 W or > 9000 W)
    power_watts = torque_val * (speed_val * 2.0 * math.pi / 60.0)
    pwf_risk = "CRITICAL" if (power_watts < 3500 or power_watts > 9000) else ("WARNING" if (power_watts < 3800 or power_watts > 8500) else "NORMAL")

    # 4. OSF: Overstrain Failure (tool_wear * torque exceeds product threshold)
    osf_thresholds = {"L": 11000, "M": 12000, "H": 13000}
    osf_limit = osf_thresholds.get(m_type, 12000)
    strain = tool_wear_val * torque_val
    osf_risk = "CRITICAL" if strain > osf_limit else ("WARNING" if strain > osf_limit * 0.85 else "NORMAL")

    any_critical = (
        prediction == 1
        or twf_risk == "CRITICAL"
        or hdf_risk == "CRITICAL"
        or pwf_risk == "CRITICAL"
        or osf_risk == "CRITICAL"
    )
    any_warning = (
        twf_risk == "WARNING"
        or hdf_risk == "WARNING"
        or pwf_risk == "WARNING"
        or osf_risk == "WARNING"
    )

    risk_level = "CRITICAL" if any_critical else ("WARNING" if any_warning else "LOW")

    diagnostics = {
        "tool_wear_failure": {
            "code": "TWF",
            "name": "Tool Wear Failure",
            "risk": twf_risk,
            "metric": f"{tool_wear_val:.1f} min",
            "threshold": "200.0 min",
            "details": "Tool wear duration exceeds nominal cutter replacement threshold." if twf_risk == "CRITICAL" else "Tool wear duration is within nominal operating limit."
        },
        "heat_dissipation_failure": {
            "code": "HDF",
            "name": "Heat Dissipation Failure",
            "risk": hdf_risk,
            "metric": f"{temp_diff:.2f} K diff",
            "threshold": "8.60 K diff at < 1380 RPM",
            "details": "Insufficient temperature differential between process and ambient air at low RPM." if hdf_risk == "CRITICAL" else "Temperature differential is adequate for heat dissipation."
        },
        "power_failure": {
            "code": "PWF",
            "name": "Power Failure",
            "risk": pwf_risk,
            "metric": f"{power_watts:.1f} W",
            "threshold": "3500 W – 9000 W",
            "details": "Power draw is outside the safe 3.5 kW – 9.0 kW spindle operating envelope." if pwf_risk == "CRITICAL" else "Spindle power consumption is within safe operational envelope."
        },
        "overstrain_failure": {
            "code": "OSF",
            "name": "Overstrain Failure",
            "risk": osf_risk,
            "metric": f"{strain:.1f} min·Nm",
            "threshold": f"{osf_limit} min·Nm for Variant {m_type}",
            "details": "Cumulative torque and tool wear stress exceeds mechanical threshold." if osf_risk == "CRITICAL" else "Spindle strain load is within mechanical stress limits."
        }
    }

    confidence_pct = (
        round((100.0 - probability) if prediction == 0 else probability, 2)
        if probability is not None
        else 100.0
    )

    return {
        "prediction": prediction,
        "prediction_label": "Failure Predicted" if prediction == 1 else "No Failure Predicted",
        "probability": probability,
        "confidence": confidence_pct,
        "risk_level": risk_level,
        "suggestion": suggestion,
        "diagnostics": diagnostics,
        "metrics": {
            "temp_diff_k": round(temp_diff, 2),
            "power_watts": round(power_watts, 2),
            "strain_min_nm": round(strain, 2)
        }
    }


# --------------------------------------------------
# 6. COMMON PAGE DESIGN
# --------------------------------------------------

PAGE_STYLE = """
<style>
    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        padding: 20px;
        font-family: Arial, sans-serif;
        background: #f1f5f9;
        color: #1e293b;
    }

    .container {
        max-width: 900px;
        margin: 25px auto;
        padding: 25px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    }

    h1 {
        color: #0f766e;
    }

    h2 {
        color: #334155;
    }

    input, select {
        width: 100%;
        padding: 11px;
        margin: 7px 0 15px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 15px;
    }

    button, .button {
        display: inline-block;
        background: #0f766e;
        color: white;
        padding: 11px 18px;
        border: none;
        border-radius: 6px;
        text-decoration: none;
        cursor: pointer;
        font-size: 15px;
    }

    button:hover, .button:hover {
        background: #115e59;
    }

    .card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 9px;
        padding: 18px;
        margin: 18px 0;
        overflow-wrap: anywhere;
    }

    .success {
        color: #15803d;
        background: #dcfce7;
        padding: 10px;
        border-radius: 6px;
    }

    .error {
        color: #b91c1c;
        background: #fee2e2;
        padding: 10px;
        border-radius: 6px;
    }

    .warning {
        color: #92400e;
        background: #fef3c7;
        padding: 10px;
        border-radius: 6px;
    }

    .links {
        margin: 15px 0;
    }

    .links a {
        color: #0f766e;
        margin-right: 12px;
    }

    label {
        font-weight: bold;
    }

    small {
        color: #64748b;
    }
</style>
"""


# --------------------------------------------------
# 7. HOME PAGE
# --------------------------------------------------

@app.route("/")
def home():
    if "user_id" in session:
        return redirect(url_for("dashboard"))

    return redirect(url_for("login"))


# --------------------------------------------------
# 8. SIGNUP PAGE
# --------------------------------------------------

@app.route("/signup", methods=["GET", "POST"])
def signup():

    if request.method == "POST":
        username = request.form.get(
            "username", ""
        ).strip()

        password = request.form.get(
            "password", ""
        )

        if not username or not password:
            flash("Please enter a username and password.", "error")
            return redirect(url_for("signup"))

        if len(password) < 6:
            flash(
                "Password must contain at least 6 characters.",
                "error"
            )
            return redirect(url_for("signup"))

        hashed_password = generate_password_hash(password)

        conn = get_db()

        try:
            conn.execute(
                """
                INSERT INTO users (username, password)
                VALUES (?, ?)
                """,
                (username, hashed_password)
            )

            conn.commit()

        except sqlite3.IntegrityError:
            conn.close()
            flash(
                "This username already exists. Choose another.",
                "error"
            )
            return redirect(url_for("signup"))

        conn.close()

        flash("Account created successfully! Please log in.", "success")
        return redirect(url_for("login"))

    return render_template_string("""
    <!doctype html>
    <html>
    <head>
        <title>SmartMaintainAI - Sign Up</title>
        {{ style|safe }}
    </head>
    <body>
        <div class="container">
            <h1>SmartMaintainAI</h1>
            <h2>Create Your Account</h2>

            {% for category, message in get_flashed_messages(with_categories=true) %}
                <p class="{{ category }}">{{ message }}</p>
            {% endfor %}

            <form method="POST">
                <label>Username</label>
                <input
                    type="text"
                    name="username"
                    required
                    maxlength="80"
                    autocomplete="username"
                >

                <label>Password (minimum 6 characters)</label>
                <input
                    type="password"
                    name="password"
                    required
                    minlength="6"
                    autocomplete="new-password"
                >

                <button type="submit">Sign Up</button>
            </form>

            <p>
                Already have an account?
                <a href="/login">Login here</a>
            </p>
        </div>
    </body>
    </html>
    """, style=PAGE_STYLE)


# --------------------------------------------------
# 9. LOGIN PAGE
# --------------------------------------------------

@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":
        username = request.form.get(
            "username", ""
        ).strip()

        password = request.form.get(
            "password", ""
        )

        conn = get_db()

        user = conn.execute(
            """
            SELECT * FROM users
            WHERE username = ?
            """,
            (username,)
        ).fetchone()

        conn.close()

        if user and check_password_hash(
            user["password"], password
        ):
            session.clear()
            session["user_id"] = user["id"]
            session["username"] = user["username"]

            return redirect(url_for("dashboard"))

        flash("Invalid username or password.", "error")
        return redirect(url_for("login"))

    return render_template_string("""
    <!doctype html>
    <html>
    <head>
        <title>SmartMaintainAI - Login</title>
        {{ style|safe }}
    </head>
    <body>
        <div class="container">
            <h1>SmartMaintainAI</h1>
            <h2>Login</h2>

            {% for category, message in get_flashed_messages(with_categories=true) %}
                <p class="{{ category }}">{{ message }}</p>
            {% endfor %}

            <form method="POST">
                <label>Username</label>
                <input
                    type="text"
                    name="username"
                    required
                    autocomplete="username"
                >

                <label>Password</label>
                <input
                    type="password"
                    name="password"
                    required
                    autocomplete="current-password"
                >

                <button type="submit">Login</button>
            </form>

            <p>
                Don't have an account?
                <a href="/signup">Create Account</a>
            </p>
        </div>
    </body>
    </html>
    """, style=PAGE_STYLE)


# --------------------------------------------------
# 10. DASHBOARD WITH AI PREDICTIONS
# --------------------------------------------------

@app.route("/dashboard")
def dashboard():

    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = get_db()

    # Only show machines owned by the logged-in user.
    machines = conn.execute(
        """
        SELECT * FROM machines
        WHERE owner_id = ?
        ORDER BY id DESC
        """,
        (session["user_id"],)
    ).fetchall()

    conn.close()

    machine_results = []

    for machine in machines:
        result = predict_machine(machine)

        machine_results.append({
            "machine": machine,
            "prediction": result["prediction"],
            "probability": result["probability"],
            "suggestion": result["suggestion"]
        })

    return render_template_string("""
    <!doctype html>
    <html>
    <head>
        <title>SmartMaintainAI Dashboard</title>
        {{ style|safe }}
    </head>
    <body>
        <div class="container">

            <h1>SmartMaintainAI Dashboard</h1>

            <p>
                Welcome,
                <b>{{ username }}</b>!
            </p>

            <div class="links">
                <a class="button" href="/add-machine">+ Add Machine</a>
                <a href="/logout">Logout</a>
            </div>

            {% for category, message in get_flashed_messages(with_categories=true) %}
                <p class="{{ category }}">{{ message }}</p>
            {% endfor %}

            <h2>Your Machines ({{ machine_results|length }})</h2>

            {% if machine_results %}

                {% for item in machine_results %}

                    <div class="card">

                        <h2>{{ item.machine.machine_name }}</h2>

                        <p>
                            <b>Machine Type:</b>
                            {{ item.machine.machine_type }}
                        </p>

                        <p>
                            <b>Air Temperature:</b>
                            {{ item.machine.air_temperature }} K
                        </p>

                        <p>
                            <b>Process Temperature:</b>
                            {{ item.machine.process_temperature }} K
                        </p>

                        <p>
                            <b>Rotational Speed:</b>
                            {{ item.machine.rotational_speed }} RPM
                        </p>

                        <p>
                            <b>Torque:</b>
                            {{ item.machine.torque }} Nm
                        </p>

                        <p>
                            <b>Tool Wear:</b>
                            {{ item.machine.tool_wear }} minutes
                        </p>

                        <hr>

                        <h3>AI Prediction</h3>

                        {% if item.prediction == 1 %}

                            <p class="error">
                                ⚠️ Failure Predicted
                            </p>

                        {% else %}

                            <p class="success">
                                No Failure Predicted
                            </p>

                        {% endif %}

                        {% if item.probability is not none %}

                            <p>
                                <b>Model-estimated failure probability:</b>
                                {{ "%.2f"|format(item.probability) }}%
                            </p>

                        {% endif %}

                        <h3>Maintenance Suggestion</h3>

                        <p>{{ item.suggestion }}</p>

                    </div>

                {% endfor %}

            {% else %}

                <p>
                    No machines added yet.
                    Click Add Machine to get started.
                </p>

            {% endif %}

            <p>
                <small>
                    These are experimental model predictions, not
                    guarantees of machine safety or failure.
                    Use appropriate inspections and maintenance procedures.
                </small>
            </p>

        </div>
    </body>
    </html>
    """,
    style=PAGE_STYLE,
    username=session["username"],
    machine_results=machine_results)


# --------------------------------------------------
# 11. ADD MACHINE PAGE
# --------------------------------------------------

@app.route("/add-machine", methods=["GET", "POST"])
def add_machine():

    if "user_id" not in session:
        return redirect(url_for("login"))

    if request.method == "POST":

        machine_name = request.form.get(
            "machine_name", ""
        ).strip()

        machine_type = request.form.get(
            "machine_type", ""
        ).strip().upper()

        if not machine_name:
            flash("Please enter a machine name.", "error")
            return redirect(url_for("add_machine"))

        if len(machine_name) > 100:
            flash("Machine name is too long.", "error")
            return redirect(url_for("add_machine"))

        if machine_type not in ["L", "M", "H"]:
            flash("Please select a valid machine type.", "error")
            return redirect(url_for("add_machine"))

        try:
            air_temperature = float(
                request.form.get("air_temperature", "")
            )

            process_temperature = float(
                request.form.get("process_temperature", "")
            )

            rotational_speed = float(
                request.form.get("rotational_speed", "")
            )

            torque = float(
                request.form.get("torque", "")
            )

            tool_wear = float(
                request.form.get("tool_wear", "")
            )

        except (ValueError, TypeError):
            flash("Please enter valid numbers in all measurement fields.", "error")
            return redirect(url_for("add_machine"))

        values = [
            air_temperature,
            process_temperature,
            rotational_speed,
            torque,
            tool_wear
        ]

        # Reject invalid or infinite values.
        import math

        if not all(math.isfinite(value) for value in values):
            flash("Measurements must be finite numbers.", "error")
            return redirect(url_for("add_machine"))

        if (
            air_temperature <= 0
            or process_temperature <= 0
            or rotational_speed <= 0
            or torque < 0
            or tool_wear < 0
        ):
            flash(
                "Temperatures and speed must be positive; "
                "torque and tool wear cannot be negative.",
                "error"
            )
            return redirect(url_for("add_machine"))

        conn = get_db()

        conn.execute(
            """
            INSERT INTO machines (
                owner_id,
                machine_name,
                machine_type,
                air_temperature,
                process_temperature,
                rotational_speed,
                torque,
                tool_wear
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session["user_id"],
                machine_name,
                machine_type,
                air_temperature,
                process_temperature,
                rotational_speed,
                torque,
                tool_wear
            )
        )

        conn.commit()
        conn.close()

        flash(
            "Machine added successfully! AI prediction is available on your dashboard.",
            "success"
        )

        return redirect(url_for("dashboard"))

    return render_template_string("""
    <!doctype html>
    <html>
    <head>
        <title>Add Machine - SmartMaintainAI</title>
        {{ style|safe }}
    </head>
    <body>
        <div class="container">

            <h1>Add a Machine</h1>

            <p>
                Enter the machine measurements to save the machine
                and view its AI prediction on your dashboard.
            </p>

            {% for category, message in get_flashed_messages(with_categories=true) %}
                <p class="{{ category }}">{{ message }}</p>
            {% endfor %}

            <form method="POST">

                <label>Machine Name</label>
                <input
                    type="text"
                    name="machine_name"
                    placeholder="Example: MOTOR-001"
                    required
                    maxlength="100"
                >

                <label>Machine Type</label>
                <select name="machine_type" required>
                    <option value="">Select Type</option>
                    <option value="L">L</option>
                    <option value="M">M</option>
                    <option value="H">H</option>
                </select>

                <label>Air Temperature (K)</label>
                <input
                    type="number"
                    name="air_temperature"
                    step="any"
                    min="0.01"
                    required
                >

                <label>Process Temperature (K)</label>
                <input
                    type="number"
                    name="process_temperature"
                    step="any"
                    min="0.01"
                    required
                >

                <label>Rotational Speed (RPM)</label>
                <input
                    type="number"
                    name="rotational_speed"
                    step="any"
                    min="0.01"
                    required
                >

                <label>Torque (Nm)</label>
                <input
                    type="number"
                    name="torque"
                    step="any"
                    min="0"
                    required
                >

                <label>Tool Wear (Minutes)</label>
                <input
                    type="number"
                    name="tool_wear"
                    step="any"
                    min="0"
                    required
                >

                <button type="submit">Save Machine & Predict</button>

            </form>

            <p>
                <a href="/dashboard">Back to Dashboard</a>
            </p>

        </div>
    </body>
    </html>
    """, style=PAGE_STYLE)


# --------------------------------------------------
# 12. LOGOUT
# --------------------------------------------------

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# --------------------------------------------------
# 13. CORS MIDDLEWARE FOR REST API
# --------------------------------------------------

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-User-Id, X-Auth-Token, Accept"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD"
    return response


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        origin = request.headers.get("Origin")
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        else:
            response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-User-Id, X-Auth-Token, Accept"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD"
        return response


def get_authenticated_user_id():
    """
    Retrieves and validates the authenticated user ID from:
    1. Flask session cookie (session['user_id'])
    2. Signed Bearer token in Authorization header or X-Auth-Token header
    3. Verified X-User-Id header (validated against SQLite database)
    """
    # 1. Active Flask session
    if "user_id" in session:
        return session["user_id"]

    # 2. Signed token verification
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "X-Auth-Token" in request.headers:
        token = request.headers.get("X-Auth-Token", "").strip()

    if token:
        try:
            serializer = itsdangerous.URLSafeTimedSerializer(app.secret_key)
            data = serializer.loads(token, max_age=86400 * 7)
            uid = data.get("user_id")
            if uid:
                session["user_id"] = uid
                session["username"] = data.get("username", "")
                return uid
        except (itsdangerous.BadSignature, itsdangerous.SignatureExpired):
            pass

    # 3. Verified X-User-Id header fallback
    header_uid = request.headers.get("X-User-Id")
    if header_uid:
        try:
            uid_int = int(header_uid)
            conn = get_db()
            user = conn.execute("SELECT id, username FROM users WHERE id = ?", (uid_int,)).fetchone()
            conn.close()
            if user:
                session["user_id"] = user["id"]
                session["username"] = user["username"]
                return user["id"]
        except (ValueError, TypeError):
            pass

    return None


# --------------------------------------------------
# 14. REST API: AUTHENTICATION
# --------------------------------------------------

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must contain at least 6 characters."}), 400

    hashed_password = generate_password_hash(password)
    conn = get_db()
    try:
        cursor = conn.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            (username, hashed_password)
        )
        conn.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "This username is already taken. Please choose another."}), 409

    conn.close()

    session.clear()
    session["user_id"] = user_id
    session["username"] = username

    serializer = itsdangerous.URLSafeTimedSerializer(app.secret_key)
    token = serializer.dumps({"user_id": user_id, "username": username})

    return jsonify({
        "success": True,
        "message": "Account created successfully.",
        "token": token,
        "user": {
            "id": user_id,
            "username": username
        }
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    if user and check_password_hash(user["password"], password):
        session.clear()
        session["user_id"] = user["id"]
        session["username"] = user["username"]

        serializer = itsdangerous.URLSafeTimedSerializer(app.secret_key)
        token = serializer.dumps({"user_id": user["id"], "username": user["username"]})

        return jsonify({
            "success": True,
            "message": "Signed in successfully.",
            "token": token,
            "user": {
                "id": user["id"],
                "username": user["username"]
            }
        }), 200

    return jsonify({"error": "Invalid username or password."}), 401


@app.route("/api/auth/me", methods=["GET"])
def api_auth_me():
    user_id = get_authenticated_user_id()
    if not user_id:
        return jsonify({"authenticated": False, "user": None}), 200

    conn = get_db()
    user = conn.execute("SELECT id, username FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    if user:
        return jsonify({
            "authenticated": True,
            "user": {
                "id": user["id"],
                "username": user["username"]
            }
        }), 200

    return jsonify({"authenticated": False, "user": None}), 200


@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True, "message": "Signed out successfully."}), 200


# --------------------------------------------------
# 15. REST API: HEALTH & MODEL INFO
# --------------------------------------------------

@app.route("/api/health", methods=["GET", "HEAD", "OPTIONS"])
@app.route("/health", methods=["GET", "HEAD", "OPTIONS"])
@app.route("/api", methods=["GET", "HEAD", "OPTIONS"])
def api_health():
    if request.method == "OPTIONS":
        return "", 204

    is_loaded = model is not None and hasattr(model, "predict")
    return jsonify({
        "status": "healthy",
        "service": "SmartMaintainAI API",
        "model_loaded": is_loaded,
        "model_type": type(model).__name__ if is_loaded else None,
        "n_estimators": getattr(model, "n_estimators", 200) if is_loaded else None,
        "feature_columns": feature_columns,
        "classes": [int(c) for c in model.classes_] if is_loaded and hasattr(model, "classes_") else [0, 1],
        "endpoints": {
            "health": "/api/health",
            "predict": "/api/predict",
            "machines": "/api/machines",
            "dashboard_stats": "/api/dashboard/stats",
            "auth_login": "/api/auth/login",
            "auth_register": "/api/auth/register",
            "auth_me": "/api/auth/me",
            "auth_logout": "/api/auth/logout"
        }
    }), 200


# --------------------------------------------------
# 16. REST API: PREDICT (CORE INFERENCE)
# --------------------------------------------------

def extract_numeric_measurement(data, key_aliases, field_name, min_val=None, allow_zero=True):
    """
    Safely retrieves and converts a numeric measurement from a dictionary given key aliases.
    Correctly accepts 0 and 0.0 without treating them as falsy values.
    Rejects missing, non-numeric, NaN, and Infinite values.
    """
    raw_val = None
    for k in key_aliases:
        if k in data and data[k] is not None and str(data[k]).strip() != "":
            raw_val = data[k]
            break

    if raw_val is None:
        raise ValueError(f"Missing required parameter: {field_name}")

    try:
        val = float(raw_val)
    except (ValueError, TypeError):
        raise ValueError(f"Parameter '{field_name}' must be a valid numeric value.")

    if not math.isfinite(val):
        raise ValueError(f"Parameter '{field_name}' must be a finite number.")

    if min_val is not None:
        if allow_zero:
            if val < min_val:
                raise ValueError(f"Parameter '{field_name}' cannot be negative (got {val}).")
        else:
            if val <= min_val:
                raise ValueError(f"Parameter '{field_name}' must be greater than {min_val} (got {val}).")

    return val


@app.route("/api/predict", methods=["POST"])
def api_predict():
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    if not data:
        return jsonify({"error": "No input payload provided. JSON body required."}), 400

    # Machine Type
    m_type_raw = None
    for k in ["machine_type", "qualityType", "quality_type", "type", "Type"]:
        if k in data and data[k] is not None and str(data[k]).strip() != "":
            m_type_raw = str(data[k]).strip().upper()
            break

    if not m_type_raw:
        return jsonify({"error": "Missing required parameters: machine_type (or qualityType)"}), 400

    m_type_str = m_type_raw
    if m_type_str not in ["L", "M", "H"]:
        return jsonify({"error": "Machine quality type must be 'L', 'M', or 'H'."}), 400

    try:
        air_temp_f = extract_numeric_measurement(
            data,
            ["air_temperature", "airTemperature", "airTemp", "Air temperature [K]"],
            "air_temperature",
            min_val=0.0,
            allow_zero=False
        )
        proc_temp_f = extract_numeric_measurement(
            data,
            ["process_temperature", "processTemperature", "procTemp", "Process temperature [K]"],
            "process_temperature",
            min_val=0.0,
            allow_zero=False
        )
        rot_speed_f = extract_numeric_measurement(
            data,
            ["rotational_speed", "rotationalSpeed", "rotSpeed", "speed", "Rotational speed [rpm]"],
            "rotational_speed",
            min_val=0.0,
            allow_zero=False
        )
        torque_f = extract_numeric_measurement(
            data,
            ["torque", "Torque", "Torque [Nm]"],
            "torque",
            min_val=0.0,
            allow_zero=True
        )
        tool_wear_f = extract_numeric_measurement(
            data,
            ["tool_wear", "toolWear", "tool_wear_min", "Tool wear [min]"],
            "tool_wear",
            min_val=0.0,
            allow_zero=True
        )
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    # Build machine dict and run prediction
    machine_dict = {
        "machine_type": m_type_raw,
        "air_temperature": air_temp_f,
        "process_temperature": proc_temp_f,
        "rotational_speed": rot_speed_f,
        "torque": torque_f,
        "tool_wear": tool_wear_f
    }

    result = predict_machine(machine_dict)

    return jsonify({
        "success": True,
        "prediction": result["prediction"],
        "prediction_label": result["prediction_label"],
        "failure_probability": round(result["probability"], 2) if result["probability"] is not None else 0.0,
        "confidence": result["confidence"],
        "risk_level": result["risk_level"],
        "suggestion": result["suggestion"],
        "failure_mode_diagnostics": result["diagnostics"],
        "metrics": result["metrics"],
        "parameters_evaluated": {
            "machine_type": m_type_str,
            "air_temperature": air_temp_f,
            "process_temperature": proc_temp_f,
            "rotational_speed": rot_speed_f,
            "torque": torque_f,
            "tool_wear": tool_wear_f
        }
    }), 200


# --------------------------------------------------
# 17. REST API: MACHINES
# --------------------------------------------------

@app.route("/api/machines", methods=["GET"])
def api_get_machines():
    user_id = get_authenticated_user_id() or request.args.get("owner_id")

    if not user_id:
        return jsonify({
            "error": "Authentication required. Please sign in to view your machines.",
            "authenticated": False
        }), 401

    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM machines WHERE owner_id = ? ORDER BY id DESC",
        (user_id,)
    ).fetchall()
    conn.close()

    machine_list = []
    for r in rows:
        m = dict(r)
        pred_res = predict_machine(m)
        m["prediction"] = pred_res["prediction"]
        m["prediction_label"] = pred_res["prediction_label"]
        m["failure_probability"] = round(pred_res["probability"], 2) if pred_res["probability"] is not None else 0.0
        m["risk_level"] = pred_res["risk_level"]
        m["suggestion"] = pred_res["suggestion"]
        m["diagnostics"] = pred_res["diagnostics"]
        machine_list.append(m)

    return jsonify({
        "success": True,
        "machines": machine_list,
        "total": len(machine_list)
    }), 200


@app.route("/api/machines", methods=["POST"])
def api_add_machine():
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    user_id = get_authenticated_user_id() or (data.get("owner_id") if isinstance(data, dict) else None) or request.args.get("owner_id")

    if not user_id:
        return jsonify({
            "error": "Authentication required. Please sign in to register a machine.",
            "authenticated": False
        }), 401
    if not data:
        return jsonify({"error": "No machine data provided."}), 400

    machine_name = str(data.get("name") or data.get("machine_name") or data.get("machineId") or "").strip()
    machine_type = str(data.get("machine_type") or data.get("qualityType") or data.get("type") or "").strip().upper()

    if not machine_name:
        return jsonify({"error": "Machine name is required."}), 400
    if machine_type not in ["L", "M", "H"]:
        return jsonify({"error": "Machine quality type must be 'L', 'M', or 'H'."}), 400

    try:
        air_temp = extract_numeric_measurement(
            data,
            ["air_temperature", "airTemperature", "airTemp", "Air temperature [K]"],
            "air_temperature",
            min_val=0.0,
            allow_zero=False
        )
        proc_temp = extract_numeric_measurement(
            data,
            ["process_temperature", "processTemperature", "procTemp", "Process temperature [K]"],
            "process_temperature",
            min_val=0.0,
            allow_zero=False
        )
        rot_speed = extract_numeric_measurement(
            data,
            ["rotational_speed", "rotationalSpeed", "rotSpeed", "speed", "Rotational speed [rpm]"],
            "rotational_speed",
            min_val=0.0,
            allow_zero=False
        )
        torque = extract_numeric_measurement(
            data,
            ["torque", "Torque", "Torque [Nm]"],
            "torque",
            min_val=0.0,
            allow_zero=True
        )
        tool_wear = extract_numeric_measurement(
            data,
            ["tool_wear", "toolWear", "tool_wear_min", "Tool wear [min]"],
            "tool_wear",
            min_val=0.0,
            allow_zero=True
        )
    except (ValueError, TypeError) as ve:
        return jsonify({
            "error": "Valid numeric values required for all measurements.",
            "details": str(ve)
        }), 400

    manufacturer = str(data.get("manufacturer") or "").strip()
    model_number = str(data.get("modelNumber") or data.get("model_number") or "").strip()
    location = str(data.get("location") or "").strip()
    description = str(data.get("description") or "").strip()
    try:
        installation_year = int(data.get("installationYear") or data.get("installation_year") or 2024)
    except (ValueError, TypeError):
        installation_year = 2024

    conn = get_db()
    cursor = conn.execute("""
        INSERT INTO machines (
            owner_id, machine_name, machine_type,
            air_temperature, process_temperature, rotational_speed,
            torque, tool_wear, manufacturer, model_number,
            location, installation_year, description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, machine_name, machine_type,
        air_temp, proc_temp, rot_speed,
        torque, tool_wear, manufacturer, model_number,
        location, installation_year, description
    ))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    machine_record = {
        "id": new_id,
        "owner_id": user_id,
        "machine_name": machine_name,
        "machine_type": machine_type,
        "air_temperature": air_temp,
        "process_temperature": proc_temp,
        "rotational_speed": rot_speed,
        "torque": torque,
        "tool_wear": tool_wear,
        "manufacturer": manufacturer,
        "model_number": model_number,
        "location": location,
        "installation_year": installation_year,
        "description": description
    }

    pred_res = predict_machine(machine_record)
    machine_record["prediction"] = pred_res["prediction"]
    machine_record["prediction_label"] = pred_res["prediction_label"]
    machine_record["failure_probability"] = round(pred_res["probability"], 2) if pred_res["probability"] is not None else 0.0
    machine_record["risk_level"] = pred_res["risk_level"]
    machine_record["suggestion"] = pred_res["suggestion"]
    machine_record["diagnostics"] = pred_res["diagnostics"]

    return jsonify({
        "success": True,
        "message": "Machine registered successfully.",
        "machine": machine_record
    }), 201


# --------------------------------------------------
# 18. REST API: DASHBOARD STATS
# --------------------------------------------------

@app.route("/api/dashboard/stats", methods=["GET"])
def api_dashboard_stats():
    conn = get_db()
    user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    total_machines = conn.execute("SELECT COUNT(*) FROM machines").fetchone()[0]

    all_machines = conn.execute("SELECT * FROM machines").fetchall()
    conn.close()

    # Type distribution
    type_counts = {"L": 0, "M": 0, "H": 0}
    prediction_counts = {"no_failure": 0, "failure_predicted": 0}
    risk_counts = {"LOW": 0, "WARNING": 0, "CRITICAL": 0}

    total_air_temp = 0.0
    total_proc_temp = 0.0
    total_speed = 0.0
    total_torque = 0.0
    total_tool_wear = 0.0

    for r in all_machines:
        m = dict(r)
        t = m.get("machine_type", "")
        if t in type_counts:
            type_counts[t] += 1

        pred_res = predict_machine(m)
        if pred_res["prediction"] == 1:
            prediction_counts["failure_predicted"] += 1
        else:
            prediction_counts["no_failure"] += 1

        r_level = pred_res["risk_level"]
        if r_level in risk_counts:
            risk_counts[r_level] += 1

        total_air_temp += float(m["air_temperature"])
        total_proc_temp += float(m["process_temperature"])
        total_speed += float(m["rotational_speed"])
        total_torque += float(m["torque"])
        total_tool_wear += float(m["tool_wear"])

    n = max(total_machines, 1)

    return jsonify({
        "success": True,
        "total_machines": total_machines,
        "total_users": user_count,
        "type_distribution": type_counts,
        "prediction_distribution": prediction_counts,
        "risk_distribution": risk_counts,
        "averages": {
            "air_temperature_k": round(total_air_temp / n, 2),
            "process_temperature_k": round(total_proc_temp / n, 2),
            "rotational_speed_rpm": round(total_speed / n, 1),
            "torque_nm": round(total_torque / n, 2),
            "tool_wear_min": round(total_tool_wear / n, 1)
        },
        "model_metadata": {
            "name": "SmartMaintainAI Milling PdM Classifier",
            "type": type(model).__name__,
            "n_estimators": getattr(model, "n_estimators", 200),
            "feature_columns": feature_columns,
            "classes": [int(c) for c in model.classes_] if hasattr(model, "classes_") else [0, 1]
        }
    }), 200


# --------------------------------------------------
# 19. ERROR HANDLERS
# --------------------------------------------------

@app.errorhandler(404)
def handle_404(e):
    if request.path.startswith("/api"):
        return jsonify({
            "error": f"The requested API route '{request.path}' was not found on this server.",
            "status": 404,
            "available_endpoints": [
                "/api/health",
                "/api/predict",
                "/api/machines",
                "/api/dashboard/stats",
                "/api/auth/login",
                "/api/auth/register",
                "/api/auth/me",
                "/api/auth/logout"
            ]
        }), 404

    return render_template_string("""
    <!doctype html>
    <html>
    <head>
        <title>404 Not Found - SmartMaintainAI</title>
        {{ style|safe }}
    </head>
    <body>
        <div class="container">
            <h1>404 - Endpoint Not Found</h1>
            <p>The requested page or endpoint <code>{{ path }}</code> was not found on this server.</p>
            <p><a class="button" href="/api/health">Check API Health</a> <a class="button" href="/dashboard">Go to Dashboard</a></p>
        </div>
    </body>
    </html>
    """, style=PAGE_STYLE, path=request.path), 404


# --------------------------------------------------
# 20. TEMPORARY ROUTE DIAGNOSTICS (DEBUG ONLY)
# --------------------------------------------------

@app.route("/__debug_routes", methods=["GET"])
def debug_routes():
    """Diagnostic endpoint returning all registered Flask routes as JSON."""
    routes = []
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
        routes.append({
            "endpoint": rule.endpoint,
            "methods": sorted(rule.methods - {"OPTIONS", "HEAD"}),
            "rule": rule.rule
        })
    return jsonify({
        "file": str(Path(__file__).resolve()),
        "import_name": app.import_name,
        "strict_slashes": app.url_map.strict_slashes,
        "total_routes": len(routes),
        "routes": routes
    }), 200


# --------------------------------------------------
# 21. START APPLICATION
# --------------------------------------------------

init_db()

def print_startup_banner():
    """Prints startup configuration and all registered Flask routes for debugging."""
    file_path = str(Path(__file__).resolve())
    routes = []
    has_api_health = False

    for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
        methods = ",".join(sorted(rule.methods - {"OPTIONS", "HEAD"}))
        routes.append((methods, rule.rule))
        if rule.rule == "/api/health":
            has_api_health = True

    print("=" * 72)
    print("  SmartMaintainAI - Machine Learning Predictive Maintenance Backend")
    print("=" * 72)
    print(f"  [__file__]       : {file_path}")
    print(f"  [app.import_name]: {app.import_name}")
    print(f"  [Model]          : {type(model).__name__} (200 Trees)")
    print(f"  [Model Loaded]   : {model is not None}")
    print(f"  [Strict Slashes] : {app.url_map.strict_slashes}")
    print(f"  [Health Route]   : {'REGISTERED [OK]' if has_api_health else 'MISSING [FAILED]'}")
    print(f"  [app.url_map]    : {app.url_map}")
    print("-" * 72)
    print("  Registered Application Routes:")
    for methods, path in routes:
        flag = " <== HEALTH CHECK" if path == "/api/health" else ""
        print(f"    {methods:10s} {path}{flag}")
    print("-" * 72)
    print("  API Base URL     : http://127.0.0.1:5000")
    print("  Health URL       : http://127.0.0.1:5000/api/health")
    print("  Debug Routes URL : http://127.0.0.1:5000/__debug_routes")
    print("=" * 72)


if __name__ == "__main__":
    print_startup_banner()
    app.run(host="0.0.0.0", port=5000, debug=True)
