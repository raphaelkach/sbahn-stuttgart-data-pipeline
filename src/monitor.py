import subprocess
import logging
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s:%(message)s')

def run_command(cmd_list):
    """Hilfsfunktion, um Befehle auszuführen und Ausnahmen zu loggen."""
    try:
        subprocess.run(cmd_list, check=True)
    except subprocess.CalledProcessError as e:
        logging.error(f"Fehler beim Ausführen von {cmd_list}: {e}")
        raise e

def main():
    logging.info("Starte stündliche Abfrage...")
    run_command(["poetry", "run", "python", "src/01_fetch_data.py"])

    logging.info("Starte tägliche Kombination...")
    run_command(["poetry", "run", "python", "src/03_combine_daily.py"])

    yesterday = (datetime.now() - timedelta(days=1)).strftime("%y%m%d")

    logging.info(f"Bereinige Daten für {yesterday}...")
    run_command(["poetry", "run", "python", "src/02_clean_data.py", yesterday])

    logging.info("Daten an combined.csv anhängen...")
    run_command(["poetry", "run", "python", "src/04_append_to_combined.py", yesterday])

    logging.info("Workflow erfolgreich abgeschlossen.")

if __name__ == "__main__":
    main()
