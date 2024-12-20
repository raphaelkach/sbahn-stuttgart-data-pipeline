import os
import geopandas as gpd

def main():
    # Ermittelt den Pfad zum Verzeichnis des Skripts
    script_dir = os.path.dirname(os.path.realpath(__file__))

    # Definiert die Pfade zu den Eingabe- und Ausgabedateien relativ zum Skriptverzeichnis
    data_path = os.path.join(script_dir, "..", "data", "raw", "railways.geojson")
    processed_path = os.path.join(script_dir, "..", "data", "processed", "platforms.geojson")
    results_path = os.path.join(script_dir, "..", "data", "results", "stats.csv")

    # Einlesen der Rohdaten
    # Stellen Sie sicher, dass die Datei 'railways.geojson' vorhanden ist!
    gdf = gpd.read_file(data_path)

    # Überblick über die Daten
    print("Spalten:", gdf.columns)
    print("Anzahl Features:", len(gdf))

    # Beispiel: Filtern nach railway=platform
    # Passen Sie diesen Filter an, wenn Sie z. B. nach 'rail' oder 'engine_shed' suchen wollen.
    platforms = gdf[gdf["railway"] == "platform"]

    # Reprojektion für metrische Berechnungen (optional, falls nicht schon in ETRS89/UTM)
    # EPSG:25832 ist ein UTM-Koordinatensystem für den Raum Stuttgart, das metrische Einheiten liefert.
    platforms = platforms.to_crs("EPSG:25832")

    # Fläche berechnen (nur sinnvoll, wenn es sich um Polygone handelt)
    if any(platforms.geometry.type.isin(["Polygon", "MultiPolygon"])):
        platforms["area_m2"] = platforms.area
    else:
        platforms["area_m2"] = None

    # Länge berechnen (sinnvoll bei Linien)
    if any(platforms.geometry.type.isin(["LineString", "MultiLineString"])):
        platforms["length_m"] = platforms.length
    else:
        platforms["length_m"] = None

    # Berechnen einiger Statistiken, z. B. durchschnittliche Fläche
    if "area_m2" in platforms.columns and platforms["area_m2"].notnull().any():
        mean_area = platforms["area_m2"].mean()
        print(f"Durchschnittliche Plattformfläche: {mean_area:.2f} m²")

    # Ausgaben speichern
    # Gefilterte GeoJSON-Datei
    platforms.to_file(processed_path, driver="GeoJSON")

    # Statistiken speichern (describe gibt grundlegende Statistik-Werte wieder)
    stats = platforms[["area_m2", "length_m"]].describe()
    stats.to_csv(results_path)

    print("Analyse abgeschlossen. Ergebnisse unter:")
    print(" - Verarbeitete Daten:", processed_path)
    print(" - Statistiken:", results_path)

if __name__ == "__main__":
    main()
