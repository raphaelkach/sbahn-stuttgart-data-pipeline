import os
import sys
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INTERMEDIATE_DIR = os.path.join(BASE_DIR, '..', '01_data', '02_intermediate')
PROCESSED_DIR = os.path.join(BASE_DIR, '..', '01_data', '03_processed')

# Falls ein Datum als Argument übergeben wurde, nutze dieses.
if len(sys.argv) > 1:
    date_str = sys.argv[1]
else:
    # Ansonsten das neueste '_cleaned.csv' File nehmen
    files = [f for f in os.listdir(INTERMEDIATE_DIR) if f.endswith('_cleaned.csv')]
    if not files:
        print("Keine bereinigte Tagesdatei gefunden.")
        sys.exit(0)
    files.sort()
    latest_file = files[-1]
    date_str = latest_file.replace('_cleaned.csv', '')

input_file = os.path.join(INTERMEDIATE_DIR, f'{date_str}_cleaned.csv')
output_file = os.path.join(PROCESSED_DIR, 'combined.csv')

if not os.path.exists(input_file):
    print(f"Bereinigte Datei {input_file} existiert nicht.")
    sys.exit(1)

new_data = pd.read_csv(input_file)

# Überprüfe, ob combined.csv existiert und Daten enthält
if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
    # combined.csv laden und neue Daten anhängen
    combined = pd.read_csv(output_file)
    combined = pd.concat([combined, new_data], ignore_index=True)
else:
    # combined.csv existiert nicht oder ist leer
    # Starte neu mit new_data
    combined = new_data

combined.drop_duplicates(inplace=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
combined.to_csv(output_file, index=False)
print(f"Neue Daten angehängt an {output_file}")
