
import requests
import sys

BASE_URL = "http://localhost:8000"

def test_get_network():
    try:
        response = requests.get(f"{BASE_URL}/api/network")
        response.raise_for_status()
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to backend at localhost:8000. Is it running?")
        sys.exit(1)

    data = response.json()
    
    assert "nodes" in data
    assert "links" in data
    
    nodes = data["nodes"]
    links = data["links"]
    
    print(f"Graph stats: {len(nodes)} nodes, {len(links)} links")
    
    if len(nodes) > 0:
        assert "id" in nodes[0]
        assert "value" in nodes[0]
        
    if len(links) > 0:
        assert "source" in links[0]
        assert "target" in links[0]
        assert "line" in links[0]

if __name__ == "__main__":
    try:
        test_get_network()
        print("test_get_network PASSED")
    except AssertionError as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
