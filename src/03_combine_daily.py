import os
import pandas as pd
import logging

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', '01_data')

logging.basicConfig(filename='empty_files.log', level=logging.WARNING,
                    format='%(asctime)s - %(levelname)s - %(message)s')

def combine_csv_by_date(folder_path, output_folder):
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"The directory {folder_path} does not exist.")
    
    files = [f for f in os.listdir(folder_path) if f.endswith('.csv')]
    date_files = {}

    for file in files:
        parts = file.split('_')
        if len(parts) < 2:
            continue
        date = parts[0]
        hour = parts[1][:2]
        if date not in date_files:
            date_files[date] = {}
        date_files[date][hour] = file

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for date, hour_files in date_files.items():
        valid_dfs = []
        for hour, file in hour_files.items():
            df = pd.read_csv(os.path.join(folder_path, file))
            if df.empty:
                logging.warning(f"The file {file} is empty and will be skipped.")
            else:
                valid_dfs.append(df)
        
        if valid_dfs:
            combined_df = pd.concat(valid_dfs, ignore_index=True)
            daily_file = os.path.join(output_folder, f'{date}.csv')
            combined_df.to_csv(daily_file, index=False)
            print(f"Tagesdatei für {date} erstellt: {daily_file}")

if __name__ == "__main__":
    input_folder = os.path.join(DATA_DIR, '01_raw', 'API')
    output_folder = os.path.join(DATA_DIR, '02_intermediate')
    combine_csv_by_date(input_folder, output_folder)
