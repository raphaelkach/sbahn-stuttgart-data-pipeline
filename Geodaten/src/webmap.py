import os
import folium
import geopandas as gpd
import pandas as pd

def main():
    script_dir = os.path.dirname(os.path.realpath(__file__))
    data_path = os.path.join(script_dir, "..", "data", "raw", "railways.geojson")

    gdf = gpd.read_file(data_path)
    gdf = gdf.to_crs(epsg=4326)

    # Datumsspalten in Strings umwandeln
    for col in gdf.columns:
        if pd.api.types.is_datetime64_any_dtype(gdf[col]):
            gdf[col] = gdf[col].astype(str)

    # Zentrum bestimmen (Warnung wegen CRS hier erstmal ignorieren)
    center_lat = gdf.geometry.centroid.y.mean()
    center_lon = gdf.geometry.centroid.x.mean()

    m = folium.Map(location=[center_lat, center_lon], zoom_start=12, tiles='OpenStreetMap')

    folium.GeoJson(
        gdf,
        name="Railways",
        tooltip=folium.GeoJsonTooltip(fields=["railway", "name"])  # Passen Sie die Spalten nach Bedarf an
    ).add_to(m)

    folium.LayerControl().add_to(m)

    output_map = os.path.join(script_dir, "..", "data", "results", "strecken_map.html")
    m.save(output_map)

    print("Interaktive Karte wurde erstellt:", output_map)

if __name__ == "__main__":
    main()
