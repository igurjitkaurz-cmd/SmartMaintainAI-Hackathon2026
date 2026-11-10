import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load cleaned dataset
df = pd.read_csv("data/cleaned_data.csv")

print("Dataset loaded successfully!")
print("Dataset shape:", df.shape)

# Set graph style
sns.set_theme(style="whitegrid")

# Convert machine failure values into readable labels
df["Failure Status"] = df["Machine failure"].map({
    0: "No Failure",
    1: "Failure"
})

# ---------------------------------
# Graph 1: Machine Failure Count
# ---------------------------------
plt.figure(figsize=(7, 5))

sns.countplot(
    data=df,
    x="Failure Status"
)

plt.title("Machine Failure Distribution")
plt.xlabel("Machine Status")
plt.ylabel("Number of Machines")
plt.tight_layout()
plt.show()


# ---------------------------------
# Graph 2: Air Temperature vs Failure
# ---------------------------------
plt.figure(figsize=(8, 5))

sns.boxplot(
    data=df,
    x="Failure Status",
    y="Air temperature [K]"
)

plt.title("Air Temperature vs Machine Failure")
plt.xlabel("Machine Status")
plt.ylabel("Air Temperature (K)")
plt.tight_layout()
plt.show()


# ---------------------------------
# Graph 3: Rotational Speed vs Failure
# ---------------------------------
plt.figure(figsize=(8, 5))

sns.boxplot(
    data=df,
    x="Failure Status",
    y="Rotational speed [rpm]"
)

plt.title("Rotational Speed vs Machine Failure")
plt.xlabel("Machine Status")
plt.ylabel("Rotational Speed (rpm)")
plt.tight_layout()
plt.show()


# ---------------------------------
# Graph 4: Torque vs Failure
# ---------------------------------
plt.figure(figsize=(8, 5))

sns.boxplot(
    data=df,
    x="Failure Status",
    y="Torque [Nm]"
)

plt.title("Torque vs Machine Failure")
plt.xlabel("Machine Status")
plt.ylabel("Torque (Nm)")
plt.tight_layout()
plt.show()


# ---------------------------------
# Graph 5: Tool Wear vs Failure
# ---------------------------------
plt.figure(figsize=(8, 5))

sns.boxplot(
    data=df,
    x="Failure Status",
    y="Tool wear [min]"
)

plt.title("Tool Wear vs Machine Failure")
plt.xlabel("Machine Status")
plt.ylabel("Tool Wear (minutes)")
plt.tight_layout()
plt.show()


# ---------------------------------
# Graph 6: Correlation Heatmap
# ---------------------------------
# Exclude failure-type columns to avoid
# misleading correlations with the target.
correlation_columns = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
    "Machine failure"
]

correlation_matrix = df[correlation_columns].corr()

plt.figure(figsize=(10, 7))

sns.heatmap(
    correlation_matrix,
    annot=True,
    cmap="coolwarm",
    fmt=".2f",
    linewidths=0.5
)

plt.title("Correlation Between Machine Features")
plt.tight_layout()
plt.show()


print("\nAll visualization graphs displayed successfully!")