
import requests
import sys

BASE_URL = "http://localhost:8000"

def test_get_bottlenecks():
    try:
        response = requests.get(f"{BASE_URL}/api/bottlenecks?limit=5")
        response.raise_for_status()
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to backend at localhost:8000. Is it running?")
        sys.exit(1)

    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 5
    if len(data) > 0:
        assert "pain_score" in data[0]
        assert "station_name" in data[0]
        # Check if sorted by pain_score descending
        scores = [item["pain_score"] for item in data]
        assert scores == sorted(scores, reverse=True)

def test_get_station_hourly():
    # Pick a station that likely exists, or get one from bottlenecks first
    response = requests.get(f"{BASE_URL}/api/bottlenecks")
    bottlenecks = response.json()
    if not bottlenecks:
        print("Skipping hourly test as no stations found")
        return
    
    station_name = bottlenecks[0]["station_name"]
    response = requests.get(f"{BASE_URL}/api/stations/{station_name}/hourly")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Should be 24 hours
    assert len(data) == 24
    assert data[0]["hour"] == 0
    assert data[23]["hour"] == 23
    assert "avg_delay" in data[0]

if __name__ == "__main__":
    # DIY runner if pytest not installed
    try:
        test_get_bottlenecks()
        print("test_get_bottlenecks PASSED")
        test_get_station_hourly()
        print("test_get_station_hourly PASSED")
    except AssertionError as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
