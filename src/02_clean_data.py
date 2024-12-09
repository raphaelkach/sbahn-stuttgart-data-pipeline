import pandas as pd
import numpy as np
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INTERMEDIATE_DIR = os.path.join(BASE_DIR, '..', '01_data', '02_intermediate')
PROCESSED_DIR = os.path.join(BASE_DIR, '..', '01_data', '03_processed')
STATION_FILE = os.path.join(BASE_DIR, '..', '01_data', '01_raw', 'Stationen_S-Bahnnetz_Stuttgart.csv')

# Datum ermitteln
if len(sys.argv) > 1:
    date_str = sys.argv[1]
else:
    files = [f for f in os.listdir(INTERMEDIATE_DIR) if f.endswith('.csv')]
    if not files:
        print("Keine Tagesdateien gefunden.")
        sys.exit(0)
    files.sort()
    latest_file = files[-1]
    date_str = latest_file.replace('.csv', '')

input_file = os.path.join(INTERMEDIATE_DIR, f'{date_str}.csv')
output_file = os.path.join(PROCESSED_DIR, 'combined.csv')

if not os.path.exists(input_file):
    print(f"Datei {input_file} nicht gefunden.")
    sys.exit(1)

df = pd.read_csv(input_file)
station = pd.read_csv(STATION_FILE)

# Typanpassungen
df['planned_platform'] = df['planned_platform'].astype(str)
df['changed_platform_arrival'] = df['changed_platform_arrival'].astype(str)
df['planned_arrival'] = df['planned_arrival'].astype(str)
df['planned_departure'] = df['planned_departure'].astype(str)
df['changed_arrival'] = df['changed_arrival'].astype(str)
df['changed_departure'] = df['changed_departure'].astype(str)

# Spalten neu anordnen
new_order = [
    "eva_nr", "station_name", "category_train", "train", "train_number", "ID",
    "planned_arrival", "changed_arrival", "arrival_delay_m",
    "planned_departure", "changed_departure", "departure_delay_m",
    "station_lat", "station_long", "planned_status", "priority",
    "planned_platform", "changed_platform_arrival", "path", "info",
    "arrival_status", "departure_status", "arrival_hidden", "departure_hidden",
    "arrival_path", "departure_path", "message_status"
]

df = df[new_order]

df['category_train'] = df['category_train'].astype(str)
df['train'] = df['train'].astype(str).str.replace(r'\.0$', '', regex=True)
df['train'] = df['train'].replace('nan', '')

df['line'] = df['category_train'] + df['train']
df['line'] = df['line'].str.replace(r'\.0$', '', regex=True)

# Unerwünschte Linien filtern
unwanted_lines = [
    "Bus", "BusEV", "ICE", "TGV", "WEGRB47", "MEX18", "MEX16", "MEX13",
    "MEX12", "D", "RB14b", "RE40", "RJ", "MEX", "MEX17a", "RE", "MEX90",
    "WEGRB46", "FLX", "DBK", "FLX10", "RJX", "SVG", "RB8", "NJ", "EN",
    "MEX17c", "MEX19", "IRE200", "RE14a", "RE14b", "IRE6", "IRE", "RB54",
    "WEG", "RE4", "IRE1", "RE5", "RE90", "RE87", "RB63", "RE8", "IC", "IRE8", "IC87",
    "RB14a", "RE1", "RB", "RB11", "RB64", "MEX"
]
df = df[~df['line'].isin(unwanted_lines)]

# Datumsfelder konvertieren
df['planned_arrival'] = df['planned_arrival'].str.replace(r'\.0$', '', regex=True)
df['planned_arrival'] = pd.to_datetime(df['planned_arrival'], format='%y%m%d%H%M', errors='coerce')

df['planned_departure'] = df['planned_departure'].str.replace(r'\.0$', '', regex=True)
df['planned_departure'] = pd.to_datetime(df['planned_departure'], format='%y%m%d%H%M', errors='coerce')

df['changed_arrival'] = df['changed_arrival'].str.replace(r'\.0$', '', regex=True)
df['changed_arrival'] = pd.to_datetime(df['changed_arrival'], format='%y%m%d%H%M', errors='coerce')

df['changed_departure'] = df['changed_departure'].str.replace(r'\.0$', '', regex=True)
df['changed_departure'] = pd.to_datetime(df['changed_departure'], format='%y%m%d%H%M', errors='coerce')

df['planned_platform'] = df['planned_platform'].str.replace(r'\.0$', '', regex=True)

new_order = [
    "eva_nr", "station_name", "line", "train_number", "ID",
    "planned_arrival", "changed_arrival", "arrival_delay_m",
    "planned_departure", "changed_departure", "departure_delay_m",
    "priority", "planned_platform", "changed_platform_arrival",
    "path", "info", "arrival_status", "departure_status",
    "arrival_path", "departure_path", "message_status"
]
df = df[new_order]

df['train_route_id'] = df['ID'].str.replace(r'-[^-]+$', '', regex=True)
df['train_line_number'] = df['ID'].str.extract(r'.*-(.*)$')

df = pd.merge(df, station[['eva_nr', 'name']], on='eva_nr', how='left')
df['station_name'] = df['station_name'].fillna(df['name'])
df = df.drop(columns=['name'])

valid_lines = ['S1', 'S2', 'S3', 'S6', 'S4', 'S5', 'S60', 'S62', 'S11']

data_unique = df.drop_duplicates(subset=['train_route_id', 'line'])
data_unique.loc[~data_unique['line'].isin(valid_lines), 'line'] = 'Unknown'

data_known = data_unique[data_unique['line'] != 'Unknown']
data_unknown = data_unique[data_unique['line'] == 'Unknown']

data_known = data_known.drop_duplicates(subset=['train_route_id'])
data_final = pd.concat([data_known, data_unknown], ignore_index=True)
data_final = data_final.drop_duplicates(subset=['train_route_id'])

df = pd.merge(df, data_final[['train_route_id', 'line']], on='train_route_id', how='left', suffixes=('', '_new'))
df['line'] = np.where(df['line'].isin(valid_lines), df['line'], df['line_new'])
df.drop(columns=['line_new'], inplace=True)

df = df.drop_duplicates()

condition = df['arrival_status'].str.contains('c', case=False, na=False) | \
            df['departure_status'].str.contains('c', case=False, na=False)
df['status_train'] = np.where(condition, 'cancelled', '')

df['departure_delay_m'] = df['departure_delay_m'].astype('Int64')
df['arrival_delay_m'] = df['arrival_delay_m'].astype('Int64')
df['priority'] = df['priority'].astype('Int64')

df['arrival_weekday'] = df['planned_arrival'].dt.day_name()
df['departure_weekday'] = df['planned_departure'].dt.day_name()

# Direkt an combined anhängen
os.makedirs(PROCESSED_DIR, exist_ok=True)
combined_file = os.path.join(PROCESSED_DIR, 'combined.csv')

if os.path.exists(combined_file) and os.path.getsize(combined_file) > 0:
    combined = pd.read_csv(combined_file)
    combined = pd.concat([combined, df], ignore_index=True)
else:
    combined = df

combined.drop_duplicates(inplace=True)
combined.to_csv(combined_file, index=False)
print(f"Daten direkt nach dem Cleaning an {combined_file} angehängt.")
