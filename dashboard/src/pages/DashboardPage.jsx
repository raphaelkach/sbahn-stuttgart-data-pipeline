
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, AreaChart, Area } from 'recharts';
import { Activity, Clock, AlertTriangle, Train, CheckCircle, TrendingUp, MapPin, ArrowRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { getLineColor } from '../utils/lineColors';

const API_BASE = 'http://localhost:8000/api';

// Mini Sparkline Component (same as LinesPage)
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
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: `${height}px` }}>
            <defs>
                <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
            </defs>
            <polygon points={`0,100 ${points} 100,100`} fill={`url(#grad-${color.replace('#', '')})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

export default function DashboardPage() {
    const { t } = useLanguage();
    const [stats, setStats] = useState(null);
    const [lines, setLines] = useState([]);
    const [trend, setTrend] = useState([]);
    const [hourlyTrend, setHourlyTrend] = useState([]);
    const [topDelays, setTopDelays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, linesRes, trendRes, hourlyRes, delaysRes] = await Promise.all([
                    fetch(`${API_BASE}/stats`),
                    fetch(`${API_BASE}/lines`),
                    fetch(`${API_BASE}/daily_trend`),
                    fetch(`${API_BASE}/hourly_network_trend`),
                    fetch(`${API_BASE}/top_delays`)
                ]);

                setStats(await statsRes.json());
                setLines(await linesRes.json());
                setTrend(await trendRes.json());
                setHourlyTrend(await hourlyRes.json());
                setTopDelays(await delaysRes.json());
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return <div className="flex-row justify-center items-center" style={{ height: '50vh' }}>
            <Activity className="animate-spin" size={48} color="var(--accent-primary)" />
        </div>;
    }

    // Sort lines for display
    const sortedLines = [...lines].sort((a, b) => {
        const getOrder = (line) => {
            const match = line.match(/S(\d+)/);
            if (!match) return 999;
            return parseInt(match[1]);
        };
        return getOrder(a.line) - getOrder(b.line);
    });

    return (
        <div className="flex-col gap-lg">
            {/* Header */}
            <header className="flex-col gap-xs">
                <h1>{t('dashboard.title')}</h1>
                <p className="text-secondary">{t('dashboard.subtitle')}</p>
            </header>

            {/* Global Overview Card - matches Lines card style */}
            <motion.div
                className="glass-card"
                style={{
                    padding: '0',
                    overflow: 'hidden',
                    borderTop: '4px solid var(--accent-primary)',
                    position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: 'linear-gradient(to right, rgba(15,23,42,0.5), transparent)'
                }}>
                    <div className="flex-row justify-between items-start">
                        <div className="flex-row items-center gap-md">
                            <div style={{
                                background: 'var(--accent-primary)',
                                color: '#fff',
                                fontWeight: 800,
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                fontSize: '1.3rem',
                                boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Train size={20} />
                                S-Bahn
                            </div>
                            <div className="flex-col" style={{ gap: '0.25rem' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                    Gesamtnetz Stuttgart
                                </div>
                                <div className="flex-row gap-sm items-center" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    <span className="flex-row items-center gap-xs"><MapPin size={10} /> {stats?.total_stations} Stationen</span>
                                    <span style={{ opacity: 0.3 }}>|</span>
                                    <span className="flex-row items-center gap-xs"><Train size={10} /> {stats?.total_lines} Linien</span>
                                    <span style={{ opacity: 0.3 }}>|</span>
                                    <span>{stats?.total_trains?.toLocaleString()} Fahrten</span>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '0.5rem',
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <Calendar size={12} color="var(--text-secondary)" />
                            <span className="text-secondary">{stats?.first_date} – {stats?.last_date}</span>
                            <span style={{
                                background: 'var(--accent-primary)',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '0.25rem',
                                fontWeight: 600
                            }}>{stats?.total_days} Tage</span>
                        </div>
                    </div>
                </div>

                {/* Main KPIs Section - 3 boxes like Lines */}
                <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        {/* Pünktlichkeit */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div className="flex-row items-center gap-xs" style={{ marginBottom: '0.5rem' }}>
                                <CheckCircle size={12} color={stats?.punctuality >= 50 ? 'var(--success)' : 'var(--warning)'} />
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pünktlichkeit</span>
                            </div>
                            <div className="flex-row items-end gap-sm">
                                <span className={`font-bold ${stats?.punctuality >= 50 ? 'text-success' : 'text-warning'}`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                    {stats?.punctuality}%
                                </span>
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                Best: <span className="text-success">{stats?.best_line?.line} ({stats?.best_line?.punctuality}%)</span>
                                <span style={{ margin: '0 0.3rem', opacity: 0.3 }}>|</span>
                                Worst: <span className="text-danger">{stats?.worst_line?.line}</span>
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
                                <span className={`font-bold ${stats?.avg_delay >= 6 ? 'text-danger' : 'text-primary'}`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                    {stats?.avg_delay}m
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '0.1rem' }}>
                                    / {stats?.median_delay}m median
                                </span>
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                Max: <span className="text-danger">{stats?.max_delay}m</span>
                                <span style={{ margin: '0 0.3rem', opacity: 0.3 }}>|</span>
                                Peak: <span className="text-warning">{stats?.peak_delay_hour}:00 Uhr</span>
                            </div>
                        </div>

                        {/* Ausfälle */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div className="flex-row items-center gap-xs" style={{ marginBottom: '0.5rem' }}>
                                <AlertTriangle size={12} color="var(--danger)" />
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ausfälle</span>
                            </div>
                            <div className="flex-row items-end gap-sm">
                                <span className={`font-bold ${stats?.cancellation_rate > 5 ? 'text-danger' : 'text-secondary'}`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                    {stats?.cancellation_rate}%
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '0.1rem' }}>
                                    ({stats?.cancelled_trains?.toLocaleString()} Fahrten)
                                </span>
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                Ø Fahrten/Tag: <span className="text-primary">{Math.round(stats?.total_trains / stats?.total_days)}</span>
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
                                Peak: {stats?.peak_delay_hour}:00 Uhr ({stats?.peak_delay_value}m)
                            </span>
                        </div>
                        <Sparkline data={hourlyTrend.map(h => h.avg_delay)} color="var(--accent-primary)" height={40} />
                    </div>
                </div>

                {/* Footer */}
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
                        <span style={{ opacity: 0.6 }}>Halte gesamt:</span> <span className="text-primary">{stats?.total_stops?.toLocaleString()}</span>
                    </div>
                    <div>
                        <span style={{ opacity: 0.6 }}>Fahrten gesamt:</span> <span className="text-primary">{stats?.total_trains?.toLocaleString()}</span>
                    </div>
                    <div>
                        <span style={{ opacity: 0.6 }}>Tage analysiert:</span> <span className="text-primary">{stats?.total_days}</span>
                    </div>
                </div>
            </motion.div>

            {/* Line Cards Grid - matches Lines page style */}
            <div>
                <div className="flex-row justify-between items-center" style={{ marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Linien-Übersicht</h2>
                    <Link to="/lines" className="flex-row items-center gap-xs text-secondary" style={{ fontSize: '0.8rem', textDecoration: 'none' }}>
                        Alle Details <ArrowRight size={14} />
                    </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {sortedLines.map(line => {
                        const lineColor = getLineColor(line.line);
                        const isDelayed = line.avg_delay >= 6;

                        return (
                            <Link to={`/lines/${line.line}`} key={line.line} style={{ textDecoration: 'none' }}>
                                <motion.div
                                    className="glass-card"
                                    whileHover={{ y: -3, boxShadow: `0 8px 25px -8px ${lineColor}40` }}
                                    style={{
                                        padding: '0',
                                        overflow: 'hidden',
                                        borderTop: `3px solid ${lineColor}`,
                                        position: 'relative'
                                    }}
                                >
                                    {/* Compact Header */}
                                    <div style={{
                                        padding: '0.75rem 1rem',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        background: 'linear-gradient(to right, rgba(15,23,42,0.5), transparent)'
                                    }}>
                                        <div className="flex-row justify-between items-center">
                                            <div className="flex-row items-center gap-sm">
                                                <div style={{
                                                    background: lineColor,
                                                    color: '#fff',
                                                    fontWeight: 800,
                                                    padding: '0.3rem 0.6rem',
                                                    borderRadius: '0.35rem',
                                                    fontSize: '0.9rem',
                                                    boxShadow: `0 0 12px ${lineColor}50`
                                                }}>
                                                    {line.line}
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    {line.total_stations} Stationen
                                                </span>
                                            </div>

                                            <div className={`rounded-full font-bold uppercase tracking-wide ${isDelayed
                                                ? 'text-danger'
                                                : 'text-success'
                                                }`} style={{ fontSize: '0.55rem' }}>
                                                {isDelayed ? '⚠' : '✓'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compact Metrics */}
                                    <div style={{
                                        padding: '0.75rem 1rem',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '0.5rem',
                                        fontSize: '0.7rem'
                                    }}>
                                        <div>
                                            <div className="text-secondary" style={{ fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Pünktlich</div>
                                            <div className={`font-bold ${line.punctuality >= 40 ? 'text-success' : 'text-warning'}`}>
                                                {Math.round(line.punctuality)}%
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-secondary" style={{ fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Ø Delay</div>
                                            <div className={`font-bold ${line.avg_delay >= 6 ? 'text-danger' : 'text-primary'}`}>
                                                {line.avg_delay?.toFixed(1)}m
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-secondary" style={{ fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Ausfälle</div>
                                            <div className={`font-bold ${line.cancelled_rate > 5 ? 'text-danger' : 'text-secondary'}`}>
                                                {line.cancelled_rate?.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mini Sparkline */}
                                    <div style={{ padding: '0 1rem 0.75rem' }}>
                                        <Sparkline data={line.hourly_delays} color={lineColor} height={24} />
                                    </div>
                                </motion.div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Daily Trend */}
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>{t('dashboard.charts.trendTitle')}</h3>
                    <div style={{ width: '100%', height: 220 }}>
                        <ResponsiveContainer>
                            <AreaChart data={trend}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--border-light)', borderRadius: '0.5rem' }} formatter={(value) => [`${value.toFixed(2)} min`, 'Ø Verspätung']} />
                                <Area type="monotone" dataKey="avg_delay" stroke="var(--accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Delays */}
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>{t('dashboard.charts.topDelaysTitle')}</h3>
                    <div className="flex-col gap-sm">
                        {topDelays.slice(0, 5).map((train, i) => {
                            const lineColor = getLineColor(train.line);
                            return (
                                <div key={i} style={{
                                    padding: '0.6rem 0.75rem',
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    borderRadius: '0.5rem',
                                    borderLeft: `3px solid ${lineColor}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div className="flex-row items-center gap-sm">
                                        <span style={{ fontWeight: 700, color: lineColor, minWidth: '30px' }}>{train.line}</span>
                                        <div className="flex-col">
                                            <span className="text-primary" style={{ fontSize: '0.75rem' }}>{train.station_name}</span>
                                            <span className="text-secondary" style={{ fontSize: '0.6rem' }}>
                                                {new Date(train.planned_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="font-bold text-danger" style={{ fontSize: '0.9rem' }}>+{train.arrival_delay_m}m</div>
                                </div>
                            );
                        })}
                        {topDelays.length === 0 && <span className="text-secondary">{t('dashboard.charts.noDelays')}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
