
from src.api import get_db_connection, DATA_FILE
import duckdb
import pandas as pd

try:
    con = get_db_connection()
    con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
    
    print("Executing Nodes Query...")
    nodes_query = """
    SELECT 
        station_name as id,
        COUNT(*) as value,
        LIST(DISTINCT line) as lines
    FROM sbahn 
    WHERE station_name IS NOT NULL
    GROUP BY 1
    HAVING value > 50
    """
    df = con.execute(nodes_query).fetchdf()
    print("Nodes DF Schema:")
    print(df.dtypes)
    print(df.head())
    
    nodes = df.to_dict(orient="records")
    print("Nodes converted to dict success.")
    
    # Test JSON serialization
    import json
    import numpy as np
    class NpEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, np.integer):
                return int(obj)
            if isinstance(obj, np.floating):
                return float(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            return super(NpEncoder, self).default(obj)

    print("Testing JSON Dump...")
    json.dumps(nodes, cls=NpEncoder)
    print("JSON Dump success.")

    print("Executing Links Logic...")
    links = []
    lines_list = con.execute("SELECT DISTINCT line FROM sbahn WHERE line != 'Unknown'").fetchall()
    
    existing_links = set()
    
    for line_row in lines_list:
        line = line_row[0]
        # Get one train for this line to infer sequence
        route_query = f"""
        SELECT station_name 
        FROM sbahn 
        WHERE line = '{line}' 
        AND train_route_id = (SELECT train_route_id FROM sbahn WHERE line = '{line}' LIMIT 1)
        ORDER BY planned_arrival
        """
        stops = con.execute(route_query).fetchall()
        stop_names = [s[0] for s in stops]
        
        for i in range(len(stop_names) - 1):
            source = stop_names[i]
            target = stop_names[i+1]
            if source == target: continue
            
            valid_nodes = {n['id'] for n in nodes}
            if source not in valid_nodes or target not in valid_nodes:
                continue

            link_id = tuple(sorted((source, target)))
            unique_link_key = (source, target, line)
            
            if unique_link_key not in existing_links:
                links.append({
                    "source": source,
                    "target": target,
                    "line": line
                })
                existing_links.add(unique_link_key)
    
    print("Links success.")
    print(f"Nodes: {len(nodes)}, Links: {len(links)}")

except Exception as e:
    import traceback
    traceback.print_exc()
