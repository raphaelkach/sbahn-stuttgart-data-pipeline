
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Activity, Clock, AlertTriangle, Train, CheckCircle, MapPin, TrendingUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getLineColor } from '../utils/lineColors';

const API_BASE = 'http://localhost:8000/api';

// Mini Sparkline Component
function Sparkline({ data, color, height = 32 }) {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: '100%', height: `${height}px` }}
        >
            <defs>
                <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
            </defs>
            {/* Area fill */}
            <polygon
                points={`0,100 ${points} 100,100`}
                fill={`url(#grad-${color.replace('#', '')})`}
            />
            {/* Line */}
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

export default function LinesPage() {
    const { t } = useLanguage();
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/lines`)
            .then(res => res.json())
            .then(data => {
                setLines(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    if (loading) {
        return <div className="flex-row justify-center items-center" style={{ height: '50vh' }}>
            <Activity className="animate-spin text-accent-primary" size={48} />
        </div>;
    }

    // Format time from ISO string
    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Sort lines in natural S-Bahn order (S1, S2, S3, S4, S5, S6, S60, S62)
    const sortedLines = [...lines].sort((a, b) => {
        const getOrder = (line) => {
            const match = line.match(/S(\d+)/);
            if (!match) return 999;
            const num = parseInt(match[1]);
            // S1-S6 come first, then S60, S62, etc.
            return num;
        };
        return getOrder(a.line) - getOrder(b.line);
    });

    return (
        <div className="flex-col gap-lg">
            <header className="flex-col gap-xs">
                <h1>{t('lines.title')}</h1>
                <p className="text-secondary">{t('lines.subtitle')}</p>
            </header>


            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '2.5rem' }}>
                {sortedLines.map(line => {
                    const lineColor = getLineColor(line.line);
                    const isDelayed = line.avg_delay >= 6;
                    const avgTripsPerDay = line.trips_per_day || 0;

                    return (
                        <Link to={`/lines/${line.line}`} key={line.line} style={{ textDecoration: 'none' }}>
                            <motion.div
                                className="glass-card"
                                whileHover={{ y: -5, boxShadow: `0 10px 30px -10px ${lineColor}40` }}
                                style={{
                                    padding: '0',
                                    overflow: 'hidden',
                                    borderTop: `4px solid ${lineColor}`,
                                    position: 'relative'
                                }}
                            >
                                {/* Header with Line Badge and Route */}
                                <div style={{
                                    padding: '1rem 1.25rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: 'linear-gradient(to right, rgba(15,23,42,0.5), transparent)'
                                }}>
                                    <div className="flex-row justify-between items-start">
                                        <div className="flex-row items-center gap-md">
                                            <div style={{
                                                background: lineColor,
                                                color: '#fff',
                                                fontWeight: 800,
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '1.3rem',
                                                boxShadow: `0 0 20px ${lineColor}50`,
                                                minWidth: '60px',
                                                textAlign: 'center'
                                            }}>
                                                {line.line}
                                            </div>
                                            <div className="flex-col" style={{ gap: '0.25rem' }}>
                                                <div style={{
                                                    fontSize: '0.9rem',
                                                    color: 'var(--text-primary)',
                                                    fontWeight: 600
                                                }}>
                                                    {line.route_description || `${line.start_station} ↔ ${line.end_station}`}
                                                </div>
                                                <div className="flex-row gap-sm items-center" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    <span className="flex-row items-center gap-xs"><MapPin size={10} /> {line.total_stations} Stationen</span>
                                                    <span style={{ opacity: 0.3 }}>|</span>
                                                    <span className="flex-row items-center gap-xs"><Train size={10} /> {line.unique_trains} Züge</span>
                                                    <span style={{ opacity: 0.3 }}>|</span>
                                                    <span>{avgTripsPerDay.toFixed(0)} Fahrten/Tag</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`rounded-full font-bold uppercase tracking-wide border ${isDelayed
                                            ? 'text-danger border-danger-20 bg-danger-10'
                                            : 'text-success border-success-20 bg-success-10'
                                            }`} style={{ padding: '0.3rem 0.75rem', fontSize: '0.65rem' }}>
                                            {isDelayed ? 'Verspätet' : 'Pünktlich'}
                                        </div>
                                    </div>
                                </div>

                                {/* Main KPIs Section - 2 rows of 3 */}
                                <div style={{ padding: '1rem 1.25rem' }}>
                                    {/* First Row: Delay Stats */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                                        {/* Pünktlichkeit */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div className="flex-row items-center gap-xs" style={{ marginBottom: '0.5rem' }}>
                                                <CheckCircle size={12} color={line.punctuality >= 50 ? 'var(--success)' : 'var(--warning)'} />
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pünktlichkeit</span>
                                            </div>
                                            <div className="flex-row items-end gap-sm">
                                                <span className={`font-bold ${line.punctuality >= 50 ? 'text-success' : 'text-warning'}`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                                    {Math.round(line.punctuality)}%
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                                Mo-Fr: <span className={line.weekday_punctuality?.weekday >= 40 ? 'text-success' : 'text-warning'}>{line.weekday_punctuality?.weekday}%</span>
                                                <span style={{ margin: '0 0.3rem', opacity: 0.3 }}>|</span>
                                                Sa-So: <span className={line.weekday_punctuality?.weekend >= 50 ? 'text-success' : 'text-warning'}>{line.weekday_punctuality?.weekend}%</span>
                                            </div>
                                        </div>

                                        {/* Durchschnittliche Verspätung */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div className="flex-row items-center gap-xs" style={{ marginBottom: '0.5rem' }}>
                                                <Clock size={12} color="var(--accent-primary)" />
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ø Verspätung</span>
                                            </div>
                                            <div className="flex-row items-end gap-sm">
                                                <span className={`font-bold ${line.avg_delay >= 6 ? 'text-danger' : 'text-primary'}`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                                    {line.avg_delay?.toFixed(1)}m
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '0.1rem' }}>
                                                    / {line.median_delay?.toFixed(1)}m median
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                                Max: <span className="text-danger">{line.max_delay}m</span>
                                            </div>
                                        </div>

                                        {/* Ausfälle & Gleiswechsel */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div className="flex-row items-center gap-xs" style={{ marginBottom: '0.5rem' }}>
                                                <AlertTriangle size={12} color="var(--danger)" />
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Betriebsstörungen</span>
                                            </div>
                                            <div className="flex-row items-end gap-sm">
                                                <span className={`font-bold ${line.cancelled_rate > 5 ? 'text-danger' : 'text-secondary'}`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                                    {line.cancelled_rate?.toFixed(1)}%
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '0.1rem' }}>
                                                    Ausfälle
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                                Gleiswechsel: <span className="text-warning">{line.platform_change_rate?.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sparkline with enhanced context */}
                                    <div style={{
                                        background: 'rgba(15, 23, 42, 0.4)',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div className="flex-row justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                                Verspätung nach Tageszeit (0-23 Uhr)
                                            </span>
                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                                Peak: {line.hourly_delays?.indexOf(Math.max(...(line.hourly_delays || [0])))}:00 Uhr
                                            </span>
                                        </div>
                                        <Sparkline data={line.hourly_delays} color={lineColor} height={40} />
                                    </div>
                                </div>

                                {/* Footer with schedule times */}
                                <div style={{
                                    padding: '0.6rem 1.25rem',
                                    background: 'rgba(15, 23, 42, 0.5)',
                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.65rem',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <div>
                                        <span style={{ opacity: 0.6 }}>Erste Fahrt:</span> <span className="text-primary">{formatTime(line.first_departure)}</span>
                                    </div>
                                    <div>
                                        <span style={{ opacity: 0.6 }}>Letzte Fahrt:</span> <span className="text-primary">{formatTime(line.last_arrival)}</span>
                                    </div>
                                    <div>
                                        <span style={{ opacity: 0.6 }}>Gesamtfahrten:</span> <span className="text-primary">{line.count?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
