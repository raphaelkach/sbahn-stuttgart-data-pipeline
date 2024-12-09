import os
import pandas as pd
import plotly.express as px
import plotly.io as pio

# Angenommen, du hast eine Datei "combined.csv" im Ordner 01_data/03_processed
DATA_PATH = "01_data/03_processed/combined.csv"

# Prüfe, ob die Datei existiert
if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(f"Die Datei {DATA_PATH} wurde nicht gefunden.")

# Daten laden
df = pd.read_csv(DATA_PATH)

# Beispiel: Erzeuge ein Balkendiagramm der durchschnittlichen Verspätung nach Linie
if 'line' in df.columns and 'arrival_delay_m' in df.columns:
    avg_delay_line = df.groupby('line', as_index=False)['arrival_delay_m'].mean()
    fig = px.bar(
        avg_delay_line, 
        x='line', 
        y='arrival_delay_m',
        title='Durchschnittliche Ankunftsverspätung pro Linie (Min)'
    )
else:
    # Falls deine Daten andere Spalten haben, passe es an
    raise ValueError("Die erwarteten Spalten 'line' und 'arrival_delay_m' wurden nicht gefunden.")

# Erstelle einen Ordner 'docs' (so heißt per Konvention der Ordner für GitHub Pages)
os.makedirs('docs', exist_ok=True)

# Schreibe die Grafik als HTML in den docs-Ordner
pio.write_html(fig, file="docs/delay_chart.html", auto_open=False)
print("Statisches HTML unter docs/delay_chart.html erstellt.")
