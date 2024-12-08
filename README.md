# Deutsche Bahn Workflow mit Poetry und GitHub

Dieses Repository enthält einen automatisierten Workflow, der Daten von der Deutschen Bahn API abruft, stündlich sammelt, täglich kombiniert, bereinigt und anschließend in einer zentralen `combined.csv` sammelt.

## Voraussetzungen

- Python 3.9+ (oder höher)
- [Poetry](https://python-poetry.org/)

## Einrichtung

1. **Poetry installieren und Abhängigkeiten laden:**
   ```bash
   poetry install
