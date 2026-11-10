import pandas as pd

# Load dataset
df = pd.read_csv("data/ai4i2020 (1).csv")

print("Original dataset shape:", df.shape)

# Check missing values
print("\nMissing values before cleaning:")
print(df.isnull().sum().sum())

# Check duplicate rows
print("\nDuplicate rows before cleaning:")
print(df.duplicated().sum())

# Remove duplicate rows, if any
df = df.drop_duplicates()

# Remove rows with missing values, if any
df = df.dropna()

# Remove identifier columns
df = df.drop(columns=["UDI", "Product ID"])

# Save cleaned dataset
df.to_csv("data/cleaned_data.csv", index=False)

print("\nCleaned dataset shape:", df.shape)

print("\nMissing values after cleaning:")
print(df.isnull().sum().sum())

print("\nDuplicate rows after cleaning:")
print(df.duplicated().sum())

print("\nCleaned dataset saved to data/cleaned_data.csv")
