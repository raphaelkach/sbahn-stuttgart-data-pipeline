import os
import pandas as pd
import plotly.express as px
from dash import Dash, html, dcc

# Pfad zur combined.csv
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', '01_data', '03_processed')
data_path = os.path.join(DATA_DIR, 'combined.csv')

# Daten laden
if not os.path.exists(data_path):
    # Falls keine Daten vorhanden sind, erstelle ein leeres DataFrame
    df = pd.DataFrame()
else:
    df = pd.read_csv(data_path)

# Sicherstellen, dass wir Datumsangaben als DateTime interpretieren (falls nicht schon geschehen)
if 'planned_arrival' in df.columns:
    df['planned_arrival'] = pd.to_datetime(df['planned_arrival'], errors='coerce')

# Beispielgrafiken erstellen, falls Daten vorhanden sind
if not df.empty and 'line' in df.columns and 'arrival_delay_m' in df.columns:
    # Durchschnittliche Ankunftsverspätung pro Linie
    avg_delay_line = df.groupby('line', as_index=False)['arrival_delay_m'].mean()

    fig_bar = px.bar(
        avg_delay_line, 
        x='line', 
        y='arrival_delay_m', 
        title='Durchschnittliche Ankunftsverspätung pro Linie (in Min)',
        labels={'line': 'Linie', 'arrival_delay_m': 'Durchschnittl. Verspätung (Min)'}
    )

    # Zeitverlauf der durchschnittlichen Verspätung pro Tag
    if 'planned_arrival' in df.columns:
        daily_delay = (
            df.dropna(subset=['planned_arrival', 'arrival_delay_m'])
              .groupby(df['planned_arrival'].dt.date)['arrival_delay_m']
              .mean()
              .reset_index()
        )
        daily_delay.columns = ['date', 'avg_delay']
        fig_line = px.line(
            daily_delay, 
            x='date', 
            y='avg_delay', 
            title='Durchschnittliche tägliche Verspätung (in Min)',
            labels={'date': 'Datum', 'avg_delay': 'Ø Verspätung (Min)'}
        )
    else:
        fig_line = px.line(title='Keine Datumsspalte vorhanden, keine Zeitreihe möglich.')

else:
    fig_bar = px.bar(title='Keine Daten für Verspätungen vorhanden')
    fig_line = px.line(title='Keine Daten für Zeitreihe vorhanden')

# Dash-App erstellen
app = Dash(__name__)

app.layout = html.Div(children=[
    html.H1('S-Bahn Stuttgart Dashboard'),
    html.Div(children="""
        Übersicht über kombinierte Daten, Verspätungen und Linienperformance.
    """),
    
    # Tabelle mit ersten 10 Datensätzen
    html.H2('Erste 10 Zeilen aus combined.csv'),
    html.Table([
        html.Thead(html.Tr([html.Th(col) for col in df.columns])) if not df.empty else html.Tr(),
        html.Tbody([
            html.Tr([
                html.Td(df.iloc[i][col]) for col in df.columns
            ]) for i in range(min(len(df), 10))
        ])
    ]) if not df.empty else html.Div("Keine Daten vorhanden."),

    html.H2('Durchschnittliche Ankunftsverspätung pro Linie'),
    dcc.Graph(figure=fig_bar),

    html.H2('Tägliche durchschnittliche Verspätung'),
    dcc.Graph(figure=fig_line)
])

if __name__ == '__main__':
    # Lokales Starten mit: poetry run python src/dashboard.py
    # Dann im Browser: http://127.0.0.1:8050 aufrufen
    app.run_server(debug=True, host='0.0.0.0', port=8050)
