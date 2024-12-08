import xml.etree.ElementTree as ET
import pandas as pd
import requests
import datetime
import pytz
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s:%(message)s')

API_HEADERS = {
    "DB-Client-ID": os.getenv('DB_CLIENT_ID'),
    "DB-Api-Key": os.getenv('DB_API_KEY'),
    "accept": "application/xml"
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', '01_data')
STATIONS_FILEPATH = os.path.join(DATA_DIR, '01_raw', 'Stationen_S-Bahnnetz_Stuttgart.csv')
OUTPUT_DIR = os.path.join(DATA_DIR, '01_raw', 'API')
LOG_DIR = os.path.join(OUTPUT_DIR, 'logs')

berlin_tz = pytz.timezone('Europe/Berlin')

def load_station_data(filepath=STATIONS_FILEPATH):
    logging.info("Stationsdaten werden geladen.")
    stations_df = pd.read_csv(filepath)
    logging.info("Stationsdaten erfolgreich geladen.")
    return (
        stations_df["eva_nr"].values,
        stations_df["name"].values,
        stations_df["state"].values,
        stations_df["city"].values,
        stations_df["zipcode"].values,
        stations_df["long"].values,
        stations_df["lat"].values,
        stations_df["category"].values
    )

def create_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    logging.info(f"Verzeichnis: {OUTPUT_DIR} [bereit]")
    os.makedirs(LOG_DIR, exist_ok=True)
    logging.info(f"Log-Verzeichnis: {LOG_DIR} [bereit]")

def log_csv_activity(log_file, csv_file):
    timestamp = datetime.datetime.now(berlin_tz).strftime("%Y-%m-%d %H:%M:%S")
    with open(log_file, 'a') as f:
        f.write(f"CSV '{csv_file}' wurde um {timestamp} überschrieben.\n")

def save_data(plan_df, change_df, timestamp):
    merged_df = pd.merge(
        plan_df, change_df, how='left', on='ID', suffixes=('_plan', '_change')
    )

    merged_df['arrival_delay_m'] = (
        pd.to_datetime(merged_df['changed_arrival'], format='%y%m%d%H%M') -
        pd.to_datetime(merged_df['planned_arrival'], format='%y%m%d%H%M')
    ).dt.total_seconds() / 60

    merged_df['departure_delay_m'] = (
        pd.to_datetime(merged_df['changed_departure'], format='%y%m%d%H%M') -
        pd.to_datetime(merged_df['planned_departure'], format='%y%m%d%H%M')
    ).dt.total_seconds() / 60

    if (
        merged_df["arrival_delay_m"].isna().all()
        or merged_df["arrival_delay_m"].eq(0).all()
    ) and (
        merged_df["departure_delay_m"].isna().all()
        or merged_df["departure_delay_m"].eq(0).all()
    ):
        logging.info(
            f"Keine gültigen Verspätungsdaten für {timestamp}, Speichern übersprungen."
        )
        return

    merged_df["arrival_delay_m"] = merged_df["arrival_delay_m"].fillna(0)
    merged_df["departure_delay_m"] = merged_df["departure_delay_m"].fillna(0)

    merged_file = os.path.join(OUTPUT_DIR, f"{timestamp}.csv")
    if os.path.exists(merged_file):
        old_data = pd.read_csv(merged_file)
        if not old_data.empty:
            logging.info(
                f"Gültige Daten vorhanden, Datei für {timestamp} nicht überschrieben."
            )
            return

    merged_df.to_csv(merged_file, mode="w", header=True, index=False)
    logging.info(f"Gemergte Daten für {timestamp} erfolgreich gespeichert.")

    log_file = os.path.join(LOG_DIR, f"{timestamp}.log")
    log_csv_activity(log_file, merged_file)

def get_past_hours():
    # Hole die letzte Stunde (kann angepasst werden)
    n_hours = 1
    current_time = datetime.datetime.now(berlin_tz)
    past_hours = []
    for i in range(1, n_hours + 1):
        past_time = current_time - datetime.timedelta(hours=i)
        past_hours.append((past_time.strftime("%y%m%d"), past_time.strftime("%H")))
    return past_hours

def fetch_api_data(eva_nr, date, hour):
    base_url = "https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1/"
    url_plan = f"{base_url}plan/{eva_nr}/{date}/{hour}"
    url_change = f"{base_url}fchg/{eva_nr}"

    try:
        response_plan = requests.get(url_plan, headers=API_HEADERS)
        response_change = requests.get(url_change, headers=API_HEADERS)
        response_plan.raise_for_status()
        response_change.raise_for_status()
        return response_plan, response_change
    except requests.exceptions.RequestException as e:
        logging.error(f"Fehler beim Abrufen der API-Daten für EVA-Nr. {eva_nr}: {e}")
        return None, None

def parse_xml(response):
    try:
        return ET.fromstring(response.content)
    except ET.ParseError:
        logging.error("Fehler beim Parsen der XML-Daten.")
        return None

def process_data(plan_root, change_root, eva_nr, metadata):
    plan_data, change_data = [], []

    for s in plan_root.findall('.//s'):
        plan_data.append(extract_plan_data(s, eva_nr, metadata))

    for s in change_root.findall('.//s'):
        change_data.append(extract_change_data(s))

    return pd.DataFrame(plan_data), pd.DataFrame(change_data)

def extract_plan_data(s, eva_nr, metadata):
    return {
        "ID": s.get("id"),
        "train_number": s.find("tl").get("n") if s.find("tl") is not None else None,
        "planned_arrival": s.find("ar").get("pt") if s.find("ar") is not None else None,
        "planned_departure": (
            s.find("dp").get("pt") if s.find("dp") is not None else None
        ),
        "planned_platform": (
            s.find("ar").get("pp") if s.find("ar") is not None else None
        ),
        "planned_status": s.find("ar").get("ps") if s.find("ar") is not None else None,
        "category_train": s.find("tl").get("c") if s.find("tl") is not None else None,
        "train": s.find("dp").get("l") if s.find("dp") is not None else None,
        "path": s.find("ar").get("ppth") if s.find("ar") is not None else None,
        "eva_nr": eva_nr,
        "station_name": metadata["name"],
        "station_state": metadata["state"],
        "station_city": metadata["city"],
        "station_zipcode": metadata["zipcode"],
        "station_long": metadata["long"],
        "station_lat": metadata["lat"],
        "station_category": metadata["category"],
    }

def extract_change_data(s):
    return {
        "ID": s.get("id"),
        "changed_arrival": s.find("ar").get("ct") if s.find("ar") is not None else None,
        "changed_platform_arrival": (
            s.find("ar").get("cp") if s.find("ar") is not None else None
        ),
        "changed_departure": (
            s.find("dp").get("ct") if s.find("dp") is not None else None
        ),
        "changed_platform_departure": (
            s.find("dp").get("cp") if s.find("dp") is not None else None
        ),
        "message_status": s.find("m").get("t") if s.find("m") is not None else None,
        "priority": s.find("m").get("pr") if s.find("m") is not None else None,
        "info": s.find("m").get("cat") if s.find("m") is not None else None,
        "arrival_hidden": s.find("ar").get("hi") if s.find("ar") is not None else None,
        "departure_hidden": (
            s.find("dp").get("hi") if s.find("dp") is not None else None
        ),
        "arrival_path": s.find("ar").get("ppth") if s.find("ar") is not None else None,
        "departure_path": (
            s.find("dp").get("ppth") if s.find("dp") is not None else None
        ),
        "arrival_status": s.find("ar").get("cs") if s.find("ar") is not None else None,
        "departure_status": s.find("dp").get("cs") if s.find("dp") is not None else None,
    }

def job():
    current_time = datetime.datetime.now(berlin_tz)
    logging.info(f"Job gestartet um {current_time.strftime('%Y-%m-%d %H:%M:%S')}")

    create_output_dir()

    eva_nrs, names, states, cities, zipcodes, longs, lats, categories = load_station_data()

    past_hours = get_past_hours()
    logging.info(f"Verarbeite Daten für die letzten {len(past_hours)} Stunden.")

    for date, hour in past_hours:
        all_plan_data = []
        all_change_data = []

        logging.info(f"Verarbeitung von Stunde {hour} des Datums {date}.")
        for i, eva_nr in enumerate(eva_nrs):
            metadata = {
                'name': names[i],
                'state': states[i],
                'city': cities[i],
                'zipcode': zipcodes[i],
                'long': longs[i],
                'lat': lats[i],
                'category': categories[i]
            }

            response_plan, response_change = fetch_api_data(eva_nr, date, hour)
            if response_plan and response_change:
                plan_root = parse_xml(response_plan)
                change_root = parse_xml(response_change)

                if plan_root and change_root:
                    plan_df, change_df = process_data(plan_root, change_root, eva_nr, metadata)
                    all_plan_data.append(plan_df)
                    all_change_data.append(change_df)
                else:
                    logging.warning(f"XML-Daten konnten für EVA-Nr. {eva_nr} nicht geparst werden.")
            else:
                logging.warning(f"API-Daten konnten für EVA-Nr. {eva_nr} nicht abgerufen werden.")

        if all_plan_data and all_change_data:
            full_plan_df = pd.concat(all_plan_data, ignore_index=True)
            full_change_df = pd.concat(all_change_data, ignore_index=True)
            save_data(full_plan_df, full_change_df, f"{date}_{hour}")
        else:
            logging.info(f"Keine Daten für {date}_{hour} verfügbar.")

    logging.info("Job abgeschlossen.")

if __name__ == "__main__":
    job()
