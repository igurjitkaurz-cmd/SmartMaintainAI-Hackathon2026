import joblib
import pandas as pd
from pathlib import Path

# Project paths
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "machine_failure_model.pkl"

# Load the trained model
saved_data = joblib.load(MODEL_PATH)

model = saved_data["model"]
feature_columns = saved_data["feature_columns"]

print("SmartMaintainAI Model Loaded Successfully!")

# Get machine information from the user
print("\nEnter Machine Details:")

machine_type = input("Machine type (L, M, H): ").strip().upper()

if machine_type not in ["L", "M", "H"]:
    print("Invalid machine type! Please enter L, M, or H.")
    raise SystemExit

try:
    air_temp = float(input("Air temperature (K): "))
    process_temp = float(input("Process temperature (K): "))
    rotational_speed = float(input("Rotational speed (rpm): "))
    torque = float(input("Torque (Nm): "))
    tool_wear = float(input("Tool wear (minutes): "))

    # Basic input validation
    if (
        air_temp <= 0
        or process_temp <= 0
        or rotational_speed <= 0
        or torque < 0
        or tool_wear < 0
    ):
        print("Please enter valid positive temperatures and speed, and non-negative torque and tool wear.")
        raise SystemExit

except ValueError:
    print("Invalid input! Please enter numbers for all measurements.")
    raise SystemExit

# Prepare input in the same format used during training
machine_data = {
    "Air temperature [K]": air_temp,
    "Process temperature [K]": process_temp,
    "Rotational speed [rpm]": rotational_speed,
    "Torque [Nm]": torque,
    "Tool wear [min]": tool_wear,
    "Type_H": 1 if machine_type == "H" else 0,
    "Type_L": 1 if machine_type == "L" else 0,
    "Type_M": 1 if machine_type == "M" else 0
}

input_df = pd.DataFrame([machine_data])
input_df = input_df[feature_columns]

# Predict machine failure
prediction = model.predict(input_df)[0]

print("\n========== PREDICTION RESULT ==========")

if prediction == 1:
    print("⚠️ Failure Predicted!")
    print("The model identifies an increased failure risk.")
else:
    print("✅ No Failure Predicted!")
    print("The model did not predict a failure for these inputs.")

# Display model's estimated probability, if supported
if hasattr(model, "predict_proba"):
    probabilities = model.predict_proba(input_df)[0]
    failure_probability = probabilities[list(model.classes_).index(1)]

    print(f"Model-estimated failure probability: {failure_probability * 100:.2f}%")

print("\nNote: This is an experimental prediction, not a guarantee.")
