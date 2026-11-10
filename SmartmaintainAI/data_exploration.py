import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

print("Current folder:", os.getcwd())
print("Files in data folder:", os.listdir("data"))

# Load dataset
df = pd.read_csv("data/ai4i2020 (1).csv")

# 1. Dataset Shape
print("\n--- Dataset Shape ---")
print(df.shape)

# 2. Dataset Information
print("\n--- Dataset Information ---")
df.info()

# 3. First 5 Rows
print("\n--- First 5 Rows ---")
print(df.head())

# 4. Column Names
print("\n--- Column Names ---")
print(df.columns.tolist())

# 5. Missing Values
print("\n--- Missing Values ---")
print(df.isnull().sum())

# 6. Duplicate Rows
print("\n--- Duplicate Rows ---")
print("Total duplicate rows:", df.duplicated().sum())

# 7. Statistical Summary
print("\n--- Statistical Summary ---")
print(df.describe())

# 8. Machine Failure Distribution
print("\n--- Machine Failure Distribution ---")
print(df["Machine failure"].value_counts())

# 9. Machine Failure Percentage
print("\n--- Machine Failure Percentage ---")
print(df["Machine failure"].value_counts(normalize=True) * 100)

# 10. Machine Type Distribution
print("\n--- Machine Type Distribution ---")
print(df["Type"].value_counts())

# 11. Machine Failure Graph
sns.countplot(x="Machine failure", data=df)
plt.title("Machine Failure Distribution")
plt.xlabel("Machine Failure (0 = No Failure, 1 = Failure)")
plt.ylabel("Number of Records")
plt.tight_layout()
plt.show()

# 12. Temperature Distribution
df[["Air temperature [K]", "Process temperature [K]"]].hist(
    bins=20, figsize=(10, 5)
)
plt.suptitle("Temperature Distribution")
plt.tight_layout()
plt.show()

# 13. Rotational Speed Distribution
plt.figure(figsize=(8, 5))
sns.histplot(data=df, x="Rotational speed [rpm]", bins=30, kde=True)
plt.title("Rotational Speed Distribution")
plt.tight_layout()
plt.show()

# 14. Torque Distribution
plt.figure(figsize=(8, 5))
sns.histplot(data=df, x="Torque [Nm]", bins=30, kde=True)
plt.title("Torque Distribution")
plt.tight_layout()
plt.show()

# 15. Tool Wear Distribution
plt.figure(figsize=(8, 5))
sns.histplot(data=df, x="Tool wear [min]", bins=30, kde=True)
plt.title("Tool Wear Distribution")
plt.tight_layout()
plt.show()

print("\nDataset exploration completed successfully!")
