import subprocess
import os
import sys
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'pipeline.log'))
    ]
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def run_script(script_name):
    script_path = os.path.join(BASE_DIR, script_name)
    if not os.path.exists(script_path):
        logging.error(f"Script not found: {script_path}")
        return False
    
    logging.info(f"Starting {script_name}...")
    try:
        # Run the script using the same python interpreter
        result = subprocess.run(
            [sys.executable, script_path], 
            check=True, 
            capture_output=True, 
            text=True
        )
        logging.info(f"Finished {script_name} successfully.")
        if result.stdout:
            logging.info(f"Output of {script_name}:\n{result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"Error running {script_name}. Exit code: {e.returncode}")
        if e.stdout:
            logging.error(f"Output:\n{e.stdout}")
        if e.stderr:
            logging.error(f"Error output:\n{e.stderr}")
        return False

def main():
    logging.info("Pipeline execution started.")
    
    # 1. Combine daily data
    if not run_script('03_combine_daily.py'):
        logging.error("Pipeline aborted due to failure in 03_combine_daily.py")
        sys.exit(1)
        
    # 2. Clean data
    if not run_script('02_clean_data.py'):
        logging.error("Pipeline aborted due to failure in 02_clean_data.py")
        sys.exit(1)
        
    logging.info("Pipeline execution finished successfully.")

if __name__ == "__main__":
    main()
