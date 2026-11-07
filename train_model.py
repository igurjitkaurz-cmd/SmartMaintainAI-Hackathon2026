import pandas as pd
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

# -----------------------------------
# 1. Load Cleaned Dataset
# -----------------------------------

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "cleaned_data.csv"
MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(exist_ok=True)

df = pd.read_csv(DATA_PATH)

print("Dataset loaded successfully!")
print("Dataset shape:", df.shape)


# -----------------------------------
# 2. Select Features and Target
# -----------------------------------

# Features used to predict machine failure
feature_columns = [
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]"
]

X = df[feature_columns].copy()
y = df["Machine failure"]

# Convert machine type L, M, H into numeric columns
X = pd.get_dummies(
    X,
    columns=["Type"],
    dtype=int
)

# Ensure the machine-type columns are always in the same order
X = X.reindex(
    columns=[
        "Air temperature [K]",
        "Process temperature [K]",
        "Rotational speed [rpm]",
        "Torque [Nm]",
        "Tool wear [min]",
        "Type_H",
        "Type_L",
        "Type_M"
    ],
    fill_value=0
)

print("\nFeatures selected successfully!")
print("Features:", list(X.columns))


# -----------------------------------
# 3. Split Data into Training and Testing
# -----------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))


# -----------------------------------
# 4. Train Random Forest Model
# -----------------------------------

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced",
    min_samples_leaf=2,
    n_jobs=-1
)

print("\nTraining model...")

model.fit(X_train, y_train)

print("Model training completed!")


# -----------------------------------
# 5. Make Predictions
# -----------------------------------

y_pred = model.predict(X_test)


# -----------------------------------
# 6. Evaluate Model
# -----------------------------------

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, zero_division=0)
recall = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)

print("\n========== MODEL PERFORMANCE ==========")
print(f"Accuracy:  {accuracy * 100:.2f}%")
print(f"Precision: {precision * 100:.2f}%")
print(f"Recall:    {recall * 100:.2f}%")
print(f"F1 Score:  {f1 * 100:.2f}%")

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=["No Failure", "Failure"],
        zero_division=0
    )
)

print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))


# -----------------------------------
# 7. Save Trained Model
# -----------------------------------

model_path = MODEL_DIR / "machine_failure_model.pkl"

joblib.dump(
    {
        "model": model,
        "feature_columns": list(X.columns)
    },
    model_path
)

print("\nModel saved successfully!")
print("Model location:", model_path)