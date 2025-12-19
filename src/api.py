from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import duckdb
import os
from typing import List, Dict, Any

app = FastAPI(title="S-Bahn Stuttgart API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, '..', '01_data', '03_processed', 'combined.parquet')

def get_db_connection():
    if not os.path.exists(DATA_FILE):
        raise FileNotFoundError(f"Data file not found at {DATA_FILE}")
    return duckdb.connect(database=':memory:')

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/stats")
def get_stats():
    """Enhanced global statistics with detailed KPI data."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        # Main stats query
        main_query = """
        SELECT 
            COUNT(DISTINCT train_route_id) as total_trains,
            COUNT(*) as total_stops,
            AVG(arrival_delay_m) as avg_delay,
            MEDIAN(arrival_delay_m) as median_delay,
            MAX(arrival_delay_m) as max_delay,
            COUNT(DISTINCT CASE WHEN status_train = 'cancelled' THEN train_route_id END) as cancelled_trains,
            (COUNT(CASE WHEN arrival_delay_m <= 0 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as punctuality,
            MIN(DATE(planned_arrival)) as first_date,
            MAX(DATE(planned_arrival)) as last_date,
            COUNT(DISTINCT DATE(planned_arrival)) as total_days,
            COUNT(DISTINCT station_name) as total_stations,
            COUNT(DISTINCT line) as total_lines
        FROM sbahn
        WHERE planned_arrival IS NOT NULL
        """
        stats = con.execute(main_query).fetchone()
        
        # Best and worst performing lines
        lines_query = """
        SELECT 
            line,
            (COUNT(CASE WHEN arrival_delay_m <= 0 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as punctuality,
            AVG(arrival_delay_m) as avg_delay
        FROM sbahn
        WHERE line != 'Unknown' AND planned_arrival IS NOT NULL
        GROUP BY line
        ORDER BY punctuality DESC
        """
        lines_df = con.execute(lines_query).fetchdf()
        best_line = lines_df.iloc[0] if len(lines_df) > 0 else None
        worst_line = lines_df.iloc[-1] if len(lines_df) > 0 else None
        
        # Peak delay hour
        peak_query = """
        SELECT 
            CAST(strftime(planned_arrival, '%H') AS INTEGER) as hour,
            AVG(arrival_delay_m) as avg_delay
        FROM sbahn
        WHERE planned_arrival IS NOT NULL
        GROUP BY hour
        ORDER BY avg_delay DESC
        LIMIT 1
        """
        peak = con.execute(peak_query).fetchone()
        
        # Cancellation rate
        cancellation_rate = (stats[5] * 100.0 / stats[0]) if stats[0] > 0 else 0
        
        return {
            # Core metrics
            "total_trains": stats[0],
            "total_stops": stats[1],
            "avg_delay": round(stats[2] if stats[2] else 0, 2),
            "median_delay": round(stats[3] if stats[3] else 0, 1),
            "max_delay": stats[4],
            "cancelled_trains": stats[5],
            "cancellation_rate": round(cancellation_rate, 1),
            "punctuality": round(stats[6] if stats[6] else 0, 1),
            
            # Network info
            "total_stations": stats[10],
            "total_lines": stats[11],
            "total_days": stats[9],
            "first_date": str(stats[7]) if stats[7] else None,
            "last_date": str(stats[8]) if stats[8] else None,
            
            # Best/Worst lines
            "best_line": {
                "line": best_line['line'],
                "punctuality": round(best_line['punctuality'], 1),
                "avg_delay": round(best_line['avg_delay'], 2)
            } if best_line is not None else None,
            "worst_line": {
                "line": worst_line['line'],
                "punctuality": round(worst_line['punctuality'], 1),
                "avg_delay": round(worst_line['avg_delay'], 2)
            } if worst_line is not None else None,
            
            # Peak hour
            "peak_delay_hour": peak[0] if peak else None,
            "peak_delay_value": round(peak[1], 2) if peak else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lines")
def get_lines_performance():
    """Enhanced performance metrics grouped by line with route info, schedule details, and trends."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        # Main metrics query with extended statistics
        main_query = """
        SELECT 
            line,
            COUNT(DISTINCT train_route_id) as count,
            AVG(arrival_delay_m) as avg_delay,
            COUNT(DISTINCT CASE WHEN status_train = 'cancelled' THEN train_route_id END) as cancelled,
            (COUNT(CASE WHEN arrival_delay_m <= 0 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as punctuality,
            -- Extended statistics
            COUNT(DISTINCT station_name) as total_stations,
            COUNT(DISTINCT train_number) as unique_trains,
            MAX(arrival_delay_m) as max_delay,
            MEDIAN(arrival_delay_m) as median_delay,
            MIN(planned_arrival) as first_departure,
            MAX(planned_arrival) as last_arrival,
            -- Cancellation rate
            (COUNT(DISTINCT CASE WHEN status_train = 'cancelled' THEN train_route_id END) * 100.0 / NULLIF(COUNT(DISTINCT train_route_id), 0)) as cancelled_rate,
            -- Platform change rate (when changed_platform_arrival differs from planned_platform)
            (COUNT(CASE WHEN changed_platform_arrival IS NOT NULL AND changed_platform_arrival != planned_platform THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as platform_change_rate
        FROM sbahn
        WHERE line != 'Unknown'
        GROUP BY line
        ORDER BY avg_delay DESC
        """
        df = con.execute(main_query).fetchdf()
        
        # Get route endpoints for each line
        endpoints_query = """
        WITH route_endpoints AS (
            SELECT 
                line,
                train_route_id,
                arg_min(station_name, planned_arrival) as start_station,
                arg_max(station_name, planned_arrival) as end_station
            FROM sbahn
            WHERE line != 'Unknown' AND planned_arrival IS NOT NULL
            GROUP BY line, train_route_id
        ),
        endpoint_counts AS (
            SELECT 
                line,
                start_station,
                end_station,
                COUNT(*) as freq
            FROM route_endpoints
            GROUP BY line, start_station, end_station
        )
        SELECT line, start_station, end_station
        FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY line ORDER BY freq DESC) as rn
            FROM endpoint_counts
        )
        WHERE rn = 1
        """
        endpoints_df = con.execute(endpoints_query).fetchdf()
        endpoints_map = {row['line']: (row['start_station'], row['end_station']) for _, row in endpoints_df.iterrows()}
        
        # Get hourly delays for sparklines
        hourly_query = """
        SELECT 
            line,
            CAST(strftime(planned_arrival, '%H') AS INTEGER) as hour,
            AVG(arrival_delay_m) as avg_delay
        FROM sbahn
        WHERE line != 'Unknown' AND planned_arrival IS NOT NULL
        GROUP BY line, hour
        ORDER BY line, hour
        """
        hourly_df = con.execute(hourly_query).fetchdf()
        
        # Build hourly map per line
        hourly_map = {}
        for line in df['line'].unique():
            line_hourly = hourly_df[hourly_df['line'] == line]
            hourly_data = [0.0] * 24
            for _, row in line_hourly.iterrows():
                hour = int(row['hour'])
                if 0 <= hour < 24:
                    hourly_data[hour] = round(row['avg_delay'], 2) if row['avg_delay'] else 0.0
            hourly_map[line] = hourly_data
        
        # Get weekday vs weekend punctuality
        weekday_query = """
        SELECT 
            line,
            CASE WHEN arrival_weekday IN ('Saturday', 'Sunday') THEN 'weekend' ELSE 'weekday' END as day_type,
            (COUNT(CASE WHEN arrival_delay_m <= 0 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as punctuality
        FROM sbahn
        WHERE line != 'Unknown' AND arrival_weekday IS NOT NULL
        GROUP BY line, day_type
        """
        weekday_df = con.execute(weekday_query).fetchdf()
        
        weekday_map = {}
        for line in df['line'].unique():
            line_data = weekday_df[weekday_df['line'] == line]
            weekday_map[line] = {
                'weekday': round(line_data[line_data['day_type'] == 'weekday']['punctuality'].values[0], 1) if len(line_data[line_data['day_type'] == 'weekday']) > 0 else 0,
                'weekend': round(line_data[line_data['day_type'] == 'weekend']['punctuality'].values[0], 1) if len(line_data[line_data['day_type'] == 'weekend']) > 0 else 0
            }
        
        # Calculate trips per day (approximate)
        date_range_query = """
        SELECT 
            line,
            COUNT(DISTINCT train_route_id) as total_trips,
            COUNT(DISTINCT DATE(planned_arrival)) as days_count
        FROM sbahn
        WHERE line != 'Unknown' AND planned_arrival IS NOT NULL
        GROUP BY line
        """
        trips_df = con.execute(date_range_query).fetchdf()
        trips_per_day_map = {
            row['line']: round(row['total_trips'] / max(row['days_count'], 1), 1) 
            for _, row in trips_df.iterrows()
        }
        
        # Build response with all enhanced data
        result = []
        for _, row in df.iterrows():
            line = row['line']
            endpoints = endpoints_map.get(line, (None, None))
            
            result.append({
                "line": line,
                "count": int(row['count']),
                "avg_delay": round(row['avg_delay'], 2) if row['avg_delay'] else 0,
                "cancelled": int(row['cancelled']),
                "punctuality": round(row['punctuality'], 1) if row['punctuality'] else 0,
                # Route info
                "start_station": endpoints[0],
                "end_station": endpoints[1],
                "route_description": f"{endpoints[0]} ↔ {endpoints[1]}" if endpoints[0] and endpoints[1] else None,
                "total_stations": int(row['total_stations']),
                # Schedule details
                "unique_trains": int(row['unique_trains']),
                "first_departure": row['first_departure'].isoformat() if row['first_departure'] else None,
                "last_arrival": row['last_arrival'].isoformat() if row['last_arrival'] else None,
                "trips_per_day": trips_per_day_map.get(line, 0),
                # Extended delay stats
                "max_delay": int(row['max_delay']) if row['max_delay'] else 0,
                "median_delay": round(row['median_delay'], 2) if row['median_delay'] else 0,
                # Operational status
                "cancelled_rate": round(row['cancelled_rate'], 1) if row['cancelled_rate'] else 0,
                "platform_change_rate": round(row['platform_change_rate'], 1) if row['platform_change_rate'] else 0,
                # Hourly data for sparkline
                "hourly_delays": hourly_map.get(line, [0] * 24),
                # Weekday comparison
                "weekday_punctuality": weekday_map.get(line, {'weekday': 0, 'weekend': 0})
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/top_delays")
def get_top_delays(limit: int = 10):
    """Returns specific trains with highest delays."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        query = f"""
        SELECT 
            line,
            station_name,
            planned_arrival,
            arrival_delay_m,
            status_train
        FROM sbahn
        WHERE arrival_delay_m IS NOT NULL
        ORDER BY arrival_delay_m DESC
        LIMIT {limit}
        """
        df = con.execute(query).fetchdf()
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/daily_trend")
def get_daily_trend():
    """Daily average delay trend."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        # Extract date from timestamp
        query = """
        SELECT 
            strftime(planned_arrival, '%Y-%m-%d') as date,
            AVG(arrival_delay_m) as avg_delay
        FROM sbahn
        WHERE planned_arrival IS NOT NULL
        GROUP BY 1
        ORDER BY 1
        """
        df = con.execute(query).fetchdf()
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/lines/{line_id}/details")
def get_line_details(line_id: str):
    """Returns detailed statistics for a specific line matching the overview card design."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        # Main stats
        stats_query = f"""
        SELECT 
            COUNT(DISTINCT train_route_id) as total_trips,
            AVG(arrival_delay_m) as avg_delay,
            MEDIAN(arrival_delay_m) as median_delay,
            MAX(arrival_delay_m) as max_delay,
            (COUNT(CASE WHEN arrival_delay_m <= 0 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as punctuality,
            COUNT(DISTINCT CASE WHEN status_train = 'cancelled' THEN train_route_id END) as cancelled,
            (COUNT(DISTINCT CASE WHEN status_train = 'cancelled' THEN train_route_id END) * 100.0 / NULLIF(COUNT(DISTINCT train_route_id), 0)) as cancelled_rate,
            COUNT(DISTINCT station_name) as total_stations,
            MIN(planned_arrival) as first_departure,
            MAX(planned_arrival) as last_arrival
        FROM sbahn
        WHERE line = '{line_id}' AND planned_arrival IS NOT NULL
        """
        stats = con.execute(stats_query).fetchone()
        
        # Route endpoints
        endpoints_query = f"""
        WITH route_endpoints AS (
            SELECT 
                train_route_id,
                arg_min(station_name, planned_arrival) as start_station,
                arg_max(station_name, planned_arrival) as end_station
            FROM sbahn
            WHERE line = '{line_id}' AND planned_arrival IS NOT NULL
            GROUP BY train_route_id
        )
        SELECT start_station, end_station, COUNT(*) as freq
        FROM route_endpoints
        GROUP BY start_station, end_station
        ORDER BY freq DESC
        LIMIT 1
        """
        endpoints = con.execute(endpoints_query).fetchone()
        
        # Hourly delays for sparkline
        hourly_query = f"""
        SELECT 
            CAST(strftime(planned_arrival, '%H') AS INTEGER) as hour,
            AVG(arrival_delay_m) as avg_delay
        FROM sbahn
        WHERE line = '{line_id}' AND planned_arrival IS NOT NULL
        GROUP BY hour
        ORDER BY hour
        """
        hourly_df = con.execute(hourly_query).fetchdf()
        hourly_data = [0.0] * 24
        peak_hour = 0
        peak_value = 0
        for _, row in hourly_df.iterrows():
            hour = int(row['hour'])
            if 0 <= hour < 24:
                delay = round(row['avg_delay'], 2) if row['avg_delay'] else 0.0
                hourly_data[hour] = delay
                if delay > peak_value:
                    peak_value = delay
                    peak_hour = hour
        
        # Weekday vs weekend punctuality
        weekday_query = f"""
        SELECT 
            CASE WHEN arrival_weekday IN ('Saturday', 'Sunday') THEN 'weekend' ELSE 'weekday' END as day_type,
            (COUNT(CASE WHEN arrival_delay_m <= 0 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as punctuality
        FROM sbahn
        WHERE line = '{line_id}' AND arrival_weekday IS NOT NULL
        GROUP BY day_type
        """
        weekday_df = con.execute(weekday_query).fetchdf()
        weekday_punct = 0
        weekend_punct = 0
        for _, row in weekday_df.iterrows():
            if row['day_type'] == 'weekday':
                weekday_punct = round(row['punctuality'], 1)
            else:
                weekend_punct = round(row['punctuality'], 1)
        
        return {
            "line": line_id,
            "total_trips": stats[0],
            "avg_delay": round(stats[1], 2) if stats[1] else 0,
            "median_delay": round(stats[2], 2) if stats[2] else 0,
            "max_delay": stats[3],
            "punctuality": round(stats[4], 1) if stats[4] else 0,
            "cancelled": stats[5],
            "cancelled_rate": round(stats[6], 1) if stats[6] else 0,
            "total_stations": stats[7],
            "first_departure": stats[8].isoformat() if stats[8] else None,
            "last_arrival": stats[9].isoformat() if stats[9] else None,
            "start_station": endpoints[0] if endpoints else None,
            "end_station": endpoints[1] if endpoints else None,
            "hourly_delays": hourly_data,
            "peak_hour": peak_hour,
            "peak_value": round(peak_value, 2),
            "weekday_punctuality": weekday_punct,
            "weekend_punctuality": weekend_punct
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lines/{line_id}/stations")
def get_line_stations(line_id: str):
    """Returns all stations served by a specific line with delay statistics, ordered by route."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        # Get a representative route to determine station order
        route_query = f"""
        WITH route_trips AS (
            SELECT train_route_id, COUNT(*) as stops
            FROM sbahn
            WHERE line = '{line_id}' AND planned_arrival IS NOT NULL
            GROUP BY train_route_id
            ORDER BY stops DESC
            LIMIT 1
        )
        SELECT s.station_name
        FROM sbahn s
        JOIN route_trips r ON s.train_route_id = r.train_route_id
        ORDER BY s.planned_arrival
        """
        route_order = con.execute(route_query).fetchdf()
        station_order = route_order['station_name'].tolist() if len(route_order) > 0 else []
        
        # Get end station for each train trip to determine direction
        trip_directions_query = f"""
        SELECT 
            train_route_id,
            arg_max(station_name, planned_arrival) as end_station
        FROM sbahn
        WHERE line = '{line_id}' AND planned_arrival IS NOT NULL
        GROUP BY train_route_id
        """
        trip_dirs_df = con.execute(trip_directions_query).fetchdf()
        
        # Map each trip to forward/reverse based on where it ends
        forward_trips = set()
        reverse_trips = set()
        
        mid_idx = len(station_order) // 2
        for _, row in trip_dirs_df.iterrows():
            trip_id = row['train_route_id']
            end_station = row['end_station']
            
            if end_station in station_order:
                end_idx = station_order.index(end_station)
                if end_idx >= mid_idx:
                    forward_trips.add(trip_id)
                else:
                    reverse_trips.add(trip_id)
            else:
                forward_trips.add(trip_id)
        
        # Get ALL raw data for this line to compute directional stats
        all_data_query = f"""
        SELECT 
            station_name,
            train_route_id,
            arrival_delay_m,
            status_train
        FROM sbahn 
        WHERE line = '{line_id}' AND planned_arrival IS NOT NULL
        """
        all_data_df = con.execute(all_data_query).fetchdf()
        
        # Calculate directional statistics per station
        from collections import defaultdict
        
        forward_stats = defaultdict(lambda: {'delays': [], 'cancelled': set()})
        reverse_stats = defaultdict(lambda: {'delays': [], 'cancelled': set()})
        
        for _, row in all_data_df.iterrows():
            station = row['station_name']
            trip_id = row['train_route_id']
            delay = row['arrival_delay_m']
            status = row['status_train']
            
            if trip_id in forward_trips:
                stats = forward_stats[station]
            elif trip_id in reverse_trips:
                stats = reverse_stats[station]
            else:
                continue
            
            if delay is not None:
                stats['delays'].append(delay)
            if status == 'cancelled':
                stats['cancelled'].add(trip_id)
        
        # Calculate aggregated stats per station per direction
        def calc_stats(stats_dict):
            delays = stats_dict['delays']
            if not delays:
                return {
                    'stop_count': 0,
                    'avg_delay': 0,
                    'punctuality': 0,
                    'max_delay': 0,
                    'cancelled_count': len(stats_dict['cancelled'])
                }
            
            on_time = sum(1 for d in delays if d <= 0)
            return {
                'stop_count': len(delays),
                'avg_delay': round(sum(delays) / len(delays), 2),
                'punctuality': round(on_time * 100.0 / len(delays), 1),
                'max_delay': int(max(delays)),
                'cancelled_count': len(stats_dict['cancelled'])
            }
        
        # Build ordered result with directional stats
        result = []
        seen = set()
        
        all_stations = set(forward_stats.keys()) | set(reverse_stats.keys())
        
        for station in station_order:
            if station not in seen and station in all_stations:
                fwd = calc_stats(forward_stats[station])
                rev = calc_stats(reverse_stats[station])
                
                result.append({
                    "station_name": station,
                    # Total stats (sum of both directions)
                    "stop_count": fwd['stop_count'] + rev['stop_count'],
                    "avg_delay": round((fwd['avg_delay'] * fwd['stop_count'] + rev['avg_delay'] * rev['stop_count']) / max(fwd['stop_count'] + rev['stop_count'], 1), 2),
                    "punctuality": round((fwd['punctuality'] * fwd['stop_count'] + rev['punctuality'] * rev['stop_count']) / max(fwd['stop_count'] + rev['stop_count'], 1), 1) if fwd['stop_count'] + rev['stop_count'] > 0 else 0,
                    "max_delay": max(fwd['max_delay'], rev['max_delay']),
                    "cancelled_count": fwd['cancelled_count'] + rev['cancelled_count'],
                    # Forward direction stats
                    "stop_count_forward": fwd['stop_count'],
                    "avg_delay_forward": fwd['avg_delay'],
                    "punctuality_forward": fwd['punctuality'],
                    "max_delay_forward": fwd['max_delay'],
                    "cancelled_forward": fwd['cancelled_count'],
                    # Reverse direction stats
                    "stop_count_reverse": rev['stop_count'],
                    "avg_delay_reverse": rev['avg_delay'],
                    "punctuality_reverse": rev['punctuality'],
                    "max_delay_reverse": rev['max_delay'],
                    "cancelled_reverse": rev['cancelled_count']
                })
                seen.add(station)
        
        # Add any missing stations
        for station in all_stations:
            if station not in seen:
                fwd = calc_stats(forward_stats[station])
                rev = calc_stats(reverse_stats[station])
                
                result.append({
                    "station_name": station,
                    "stop_count": fwd['stop_count'] + rev['stop_count'],
                    "avg_delay": round((fwd['avg_delay'] * fwd['stop_count'] + rev['avg_delay'] * rev['stop_count']) / max(fwd['stop_count'] + rev['stop_count'], 1), 2),
                    "punctuality": round((fwd['punctuality'] * fwd['stop_count'] + rev['punctuality'] * rev['stop_count']) / max(fwd['stop_count'] + rev['stop_count'], 1), 1) if fwd['stop_count'] + rev['stop_count'] > 0 else 0,
                    "max_delay": max(fwd['max_delay'], rev['max_delay']),
                    "cancelled_count": fwd['cancelled_count'] + rev['cancelled_count'],
                    "stop_count_forward": fwd['stop_count'],
                    "avg_delay_forward": fwd['avg_delay'],
                    "punctuality_forward": fwd['punctuality'],
                    "max_delay_forward": fwd['max_delay'],
                    "cancelled_forward": fwd['cancelled_count'],
                    "stop_count_reverse": rev['stop_count'],
                    "avg_delay_reverse": rev['avg_delay'],
                    "punctuality_reverse": rev['punctuality'],
                    "max_delay_reverse": rev['max_delay'],
                    "cancelled_reverse": rev['cancelled_count']
                })
        
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lines/{line_id}/schedule")
def get_line_schedule(line_id: str):
    """Returns schedule for a specific line with trip directions."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        # Get schedule with direction info
        query = f"""
        WITH trip_endpoints AS (
            SELECT 
                train_route_id,
                arg_min(station_name, planned_arrival) as start_station,
                arg_max(station_name, planned_arrival) as end_station
            FROM sbahn
            WHERE line = '{line_id}' AND planned_arrival IS NOT NULL
            GROUP BY train_route_id
        )
        SELECT 
            s.station_name,
            s.planned_arrival,
            s.arrival_delay_m,
            s.status_train,
            s.train_route_id,
            s.line,
            s.train_number,
            t.start_station,
            t.end_station
        FROM sbahn s
        LEFT JOIN trip_endpoints t ON s.train_route_id = t.train_route_id
        WHERE s.line = '{line_id}'
        AND s.planned_arrival IS NOT NULL
        ORDER BY s.planned_arrival DESC
        LIMIT 500
        """
        df = con.execute(query).fetchdf()
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bottlenecks")
def get_bottlenecks(limit: int = 20):
    """Returns stations ranked by 'Pain Score' (Avg Delay * Traffic)."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        query = f"""
        SELECT 
            station_name,
            COUNT(DISTINCT train_route_id) as total_trains,
            AVG(arrival_delay_m) as avg_delay,
            MAX(arrival_delay_m) as max_delay,
            COUNT(DISTINCT CASE WHEN status_train = 'cancelled' THEN train_route_id END) as cancelled,
            (COUNT(DISTINCT train_route_id) * AVG(arrival_delay_m)) as pain_score
        FROM sbahn
        WHERE station_name IS NOT NULL
        GROUP BY station_name
        HAVING total_trains > 10
        ORDER BY pain_score DESC
        LIMIT {limit}
        """
        df = con.execute(query).fetchdf()
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stations/{station_name}/hourly")
def get_station_hourly(station_name: str):
    """Returns average delay by hour of day for a specific station."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        # DuckDB extraction of hour
        query = f"""
        SELECT 
            CAST(strftime(planned_arrival, '%H') AS INTEGER) as hour,
            AVG(arrival_delay_m) as avg_delay,
            COUNT(*) as count
        FROM sbahn
        WHERE station_name = '{station_name}'
        AND planned_arrival IS NOT NULL
        GROUP BY 1
        ORDER BY 1
        """
        df = con.execute(query).fetchdf()
        
        # Fill missing hours
        full_hours = pd.DataFrame({'hour': range(24)})
        merged = full_hours.merge(df, on='hour', how='left').fillna(0)
        
        return merged.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/network")
def get_network_graph():
    """Returns network graph data (nodes and links) for visualization."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        # 1. Get Nodes (Stations) with weight and serving lines
        # We aggregate the distinct lines for each station to identify hubs vs single-line stations
        nodes_query = """
        SELECT 
            station_name as id,
            COUNT(*) as value,
            LIST(DISTINCT line) as lines
        FROM sbahn 
        WHERE station_name IS NOT NULL
        GROUP BY 1
        HAVING value > 10
        """
        nodes = con.execute(nodes_query).fetchdf()
        
        # Ensure 'lines' is a python list (DuckDB/Pandas might return it as numpy array or other type)
        import numpy as np
        if 'lines' in nodes.columns:
            nodes['lines'] = nodes['lines'].apply(lambda x: list(x) if isinstance(x, (np.ndarray, list)) else [])
            
        nodes = nodes.to_dict(orient="records")
        
        # 2. Get Links (Connections)
        links = []
        lines_list = con.execute("SELECT DISTINCT line FROM sbahn WHERE line != 'Unknown'").fetchall()
        
        existing_links = set()
        
        for line_row in lines_list:
            line = line_row[0]
            
            # Find top 2 route patterns (directions) for this line
            # We identify direction by (Start Station -> End Station) pair frequency
            directions_query = f"""
            WITH route_endpoints AS (
                SELECT 
                    train_route_id,
                    arg_min(station_name, planned_arrival) as start_station,
                    arg_max(station_name, planned_arrival) as end_station
                FROM sbahn
                WHERE line = '{line}' AND planned_arrival IS NOT NULL
                GROUP BY train_route_id
            )
            SELECT 
                start_station, 
                end_station, 
                ANY_VALUE(train_route_id) as example_id,
                COUNT(*) as freq
            FROM route_endpoints
            GROUP BY 1, 2
            ORDER BY freq DESC
            LIMIT 2
            """
            directions = con.execute(directions_query).fetchall()
            
            # Iterate over identified directions (usually 2: Forward and Backward)
            for d in directions:
                start_s, end_s, route_id, freq = d
                
                # Get sequence of stations for this specific route direction
                route_query = f"""
                SELECT station_name 
                FROM sbahn 
                WHERE train_route_id = '{route_id}'
                ORDER BY planned_arrival
                """
                stops = con.execute(route_query).fetchall()
                stop_names = [s[0] for s in stops]
                
                for i in range(len(stop_names) - 1):
                    source = stop_names[i]
                    target = stop_names[i+1]
                    if source == target: continue
                    
                    # Check validity
                    valid_nodes = {n['id'] for n in nodes}
                    if source not in valid_nodes or target not in valid_nodes:
                        continue

                    # Direction preserved: Source -> Target
                    unique_link_key = (source, target, line)
                    
                    if unique_link_key not in existing_links:
                        links.append({
                            "source": source,
                            "target": target,
                            "line": line
                        })
                        existing_links.add(unique_link_key)

        return {
            "nodes": nodes,
            "links": links
        }
    except Exception as e:
        print(f"Error generating graph: {e}")
        return {"nodes": [], "links": []}

@app.get("/api/hourly_network_trend")
def get_hourly_network_trend():
    """Returns average delay by hour for the entire network."""
    try:
        con = get_db_connection()
        con.execute(f"CREATE OR REPLACE VIEW sbahn AS SELECT * FROM read_parquet('{DATA_FILE}')")
        
        query = """
        SELECT 
            CAST(strftime(planned_arrival, '%H') AS INTEGER) as hour,
            AVG(arrival_delay_m) as avg_delay,
            COUNT(*) as count
        FROM sbahn
        WHERE planned_arrival IS NOT NULL
        GROUP BY 1
        ORDER BY 1
        """
        df = con.execute(query).fetchdf()
        
        # Fill missing hours
        full_hours = pd.DataFrame({'hour': range(24)})
        merged = full_hours.merge(df, on='hour', how='left').fillna(0)
        
        return merged.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
