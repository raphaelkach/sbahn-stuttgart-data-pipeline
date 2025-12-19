export const translations = {
    en: {
        nav: {
            title: "S-Bahn Pulse",
            overview: "Overview",
            lines: "Lines",
            bottlenecks: "Bottlenecks",
            map: "Network Map"
        },
        dashboard: {
            title: "Overview",
            subtitle: "Live Traffic & Performance Analytics",
            kpi: {
                avgDelay: "Avg Delay",
                avgDelayTrend: "Overall across network",
                activeTrains: "Unique Trips",
                activeTrainsTrend: "Total unique trips",
                cancelled: "Cancelled",
                cancelledTrend: "Unique trips cancelled today",
                punctuality: "On Time %",
                punctualityTrend: "Trips with 0min delay"
            },
            lineStatus: {
                title: "Live Line Status",
                ok: "On Time",
                delayed: "Delayed",
                disrupted: "Disrupted"
            },
            charts: {
                trendTitle: "Daily Delay Trend",
                hourlyTrendTitle: "Hourly Delay Peaks",
                performanceTitle: "Performance by Line",
                topDelaysTitle: "Highest Current Delays",
                noDelays: "No major delays reported."
            }
        },
        lines: {
            title: "All Lines",
            subtitle: "Select a line to view stations and schedules.",
            loading: "Loading lines...",
            card: {
                avgDelay: "Avg Delay",
                cancelled: "Cancelled",
                active: "Active Trains",
                punctuality: "Punctuality",
                // New extended labels
                stations: "Stations",
                trains: "Trains",
                maxDelay: "Max Delay",
                tripsPerDay: "Trips/Day",
                cancelledRate: "Cancel Rate",
                platformChanges: "Platform Changes",
                medianDelay: "Median Delay",
                firstDeparture: "First",
                lastArrival: "Last",
                weekday: "Mo-Fr",
                weekend: "Sa-Su",
                route: "Route"
            },
            details: {
                back: "Back to Lines",
                stationsServed: "Stations Served",
                stationsRoute: "Stations Route",
                liveSchedule: "Live Schedule",
                loading: "Loading details...",
                filter: {
                    allDay: "All Day",
                    morning: "Morning (6-12)",
                    afternoon: "Afternoon (12-18)",
                    evening: "Evening (18+)"
                },
                table: {
                    to: "To",
                    planned: "Planned",
                    onTime: "On Time",
                    noTrains: "No trains found for this date."
                }
            },
            timeline: {
                delaysReported: "Delays reported",
                activeTraffic: "Active traffic"
            }
        },
        bottlenecks: {
            title: "Network Bottlenecks",
            subtitle: "Stations with highest \"Pain Score\" (Delays × Traffic Volume)",
            loading: "Loading analysis...",
            listTitle: "Critical Stations",
            trainsPerDay: "trains/day",
            avgDelay: "avg delay",
            stats: {
                painScore: "Pain Score",
                totalImpact: "Total Impact",
                avgDelay: "Avg Delay",
                maxDelay: "Max Delay",
                cancelled: "Cancelled"
            },
            charts: {
                heatmapTitle: "Delay Heatmap (Average Analysis)",
                delay: "Delay",
                volume: "Volume",
                trainVolume: "Train Volume"
            }
        },
        map: {
            topoTitle: "Network Topology",
            topoSubtitle: "Live visualization of stations",
            settings: {
                title: "Map Settings",
                minTraffic: "Min Traffic Filter",
                trains: "trains",
                adjustHint: "Adjust to hide smaller stations.",
                visibleLines: "Visible Lines",
                reset: "Reset"
            },
            legend: "Legend"
        }
    },
    de: {
        nav: {
            title: "S-Bahn Puls",
            overview: "Übersicht",
            lines: "Linien",
            bottlenecks: "Engpässe",
            map: "Netzplan"
        },
        dashboard: {
            title: "Übersicht",
            subtitle: "Live-Verkehr & Performance-Analyse",
            kpi: {
                avgDelay: "Ø Verspätung",
                avgDelayTrend: "Gesamt im Netzwerk",
                activeTrains: "Einzelfahrten",
                activeTrainsTrend: "Erfasste Fahrten",
                cancelled: "Ausfälle",
                cancelledTrend: "Einzelfahrten ausgefallen",
                punctuality: "Pünktlichkeit",
                punctualityTrend: "Fahrten ohne Verspätung"
            },
            lineStatus: {
                title: "Live Linien-Status",
                ok: "Pünktlich",
                delayed: "Verspätet",
                disrupted: "Störung"
            },
            charts: {
                trendTitle: "Täglicher Verspätungstrend",
                hourlyTrendTitle: "Stündliche Verspätungsspitzen",
                performanceTitle: "Performance pro Linie",
                topDelaysTitle: "Höchste aktuelle Verspätungen",
                noDelays: "Keine größeren Verspätungen gemeldet."
            }
        },
        lines: {
            title: "Alle Linien",
            subtitle: "Wähle eine Linie für Stationen und Fahrpläne.",
            loading: "Lade Linien...",
            card: {
                avgDelay: "Ø Verspätung",
                cancelled: "Ausfälle",
                active: "Aktive Züge",
                punctuality: "Pünktlichkeit",
                // New extended labels
                stations: "Stationen",
                trains: "Züge",
                maxDelay: "Max Verspätung",
                tripsPerDay: "Fahrten/Tag",
                cancelledRate: "Ausfallrate",
                platformChanges: "Gleiswechsel",
                medianDelay: "Median Versp.",
                firstDeparture: "Erste",
                lastArrival: "Letzte",
                weekday: "Mo-Fr",
                weekend: "Sa-So",
                route: "Strecke"
            },
            details: {
                back: "Zurück zu Linien",
                stationsServed: "Bediente Stationen",
                stationsRoute: "Stationsverlauf",
                liveSchedule: "Live Fahrplan",
                loading: "Lade Details...",
                filter: {
                    allDay: "Ganzer Tag",
                    morning: "Morgens (6-12)",
                    afternoon: "Nachmittags (12-18)",
                    evening: "Abends (18+)"
                },
                table: {
                    to: "Nach",
                    planned: "Geplant",
                    onTime: "Pünktlich",
                    noTrains: "Keine Züge für dieses Datum gefunden."
                }
            },
            timeline: {
                delaysReported: "Verspätungen gemeldet",
                activeTraffic: "Normalbetrieb"
            }
        },
        bottlenecks: {
            title: "Netzwerk-Engpässe",
            subtitle: "Stationen mit höchstem \"Pain Score\" (Verspätung × Aufkommen)",
            loading: "Lade Analyse...",
            listTitle: "Kritische Stationen",
            trainsPerDay: "Züge/Tag",
            avgDelay: "Ø Verspätung",
            stats: {
                painScore: "Pain Score",
                totalImpact: "Gesamteinfluss",
                avgDelay: "Ø Verspätung",
                maxDelay: "Max Verspätung",
                cancelled: "Ausfälle"
            },
            charts: {
                heatmapTitle: "Verspätungs-Heatmap (Durchschnitt)",
                delay: "Verspätung",
                volume: "Aufkommen",
                trainVolume: "Zugaufkommen"
            }
        },
        map: {
            topoTitle: "Netzwerktopologie",
            topoSubtitle: "Live-Visualisierung von Stationen",
            settings: {
                title: "Karteneinstellungen",
                minTraffic: "Min. Verkehrsaufkommen",
                trains: "Züge",
                adjustHint: "Anpassen, um kleinere Stationen auszublenden.",
                visibleLines: "Sichtbare Linien",
                reset: "Zurücksetzen"
            },
            legend: "Legende"
        }
    }
};
