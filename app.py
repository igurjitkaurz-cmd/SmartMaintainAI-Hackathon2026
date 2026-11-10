import os
import sqlite3
from pathlib import Path

import joblib
import pandas as pd

from flask import (
    Flask,
    request,
    redirect,
    url_for,
    session,
    render_template_string,
    flash
)
from werkzeug.security import generate_password_hash, check_password_hash


# --------------------------------------------------
# 1. APP CONFIGURATION
# --------------------------------------------------

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY")
if not app.secret_key:
    raise RuntimeError("SECRET_KEY environment variable is not set.")

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

    conn.commit()
    conn.close()


# --------------------------------------------------
# 5. AI PREDICTION FUNCTION
# --------------------------------------------------

def predict_machine(machine):
    machine_data = {
        "Air temperature [K]": float(
            machine["air_temperature"]
        ),
        "Process temperature [K]": float(
            machine["process_temperature"]
        ),
        "Rotational speed [rpm]": float(
            machine["rotational_speed"]
        ),
        "Torque [Nm]": float(
            machine["torque"]
        ),
        "Tool wear [min]": float(
            machine["tool_wear"]
        ),
        "Type_H": 1 if machine["machine_type"] == "H" else 0,
        "Type_L": 1 if machine["machine_type"] == "L" else 0,
        "Type_M": 1 if machine["machine_type"] == "M" else 0
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
            "Arrange a maintenance inspection. Review the machine "
            "readings and investigate possible faults. Confirm the "
            "condition through appropriate inspection."
        )
    else:
        suggestion = (
            "Continue routine monitoring and follow the "
            "manufacturer's maintenance schedule. A no-failure "
            "prediction does not guarantee that the machine is safe."
        )

    return {
        "prediction": prediction,
        "probability": probability,
        "suggestion": suggestion
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
# 13. START APPLICATION
# --------------------------------------------------

init_db()

if __name__ == "__main__":
    app.run(debug=True)
