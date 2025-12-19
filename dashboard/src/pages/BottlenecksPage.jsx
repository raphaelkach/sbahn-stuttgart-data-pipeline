import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Activity, Clock, AlertTriangle, Train, CheckCircle, TrendingUp, AlertOctagon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const API_BASE = 'http://localhost:8000/api';

// Mini Sparkline Component (reused from LinesPage)
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
            <polygon points={`0,100 ${points} 100,100`} fill={`url(#grad-${color.replace('#', '')})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

export default function BottlenecksPage() {
    const { t } = useLanguage();
    const [bottlenecks, setBottlenecks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/bottlenecks`)
            .then(res => res.json())
            .then(data => {
                setBottlenecks(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    if (loading) {
        return <div className="flex-row justify-center items-center" style={{ height: '50vh' }}>
            <Activity className="animate-spin text-accent-primary" size={48} />
        </div>;
    }

    return (
        <div className="flex-col gap-lg pb-10">
            <header className="flex-col gap-xs text-center">
                <h1>{t('bottlenecks.title')}</h1>
                <p className="text-secondary">{t('bottlenecks.subtitle')}</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
                {bottlenecks.map((station, index) => {
                    const isHighPain = station.pain_score >= 100;
                    const cardColor = isHighPain ? '#ef4444' : '#f59e0b'; // Red for high pain, Orange for warning

                    return (
                        <motion.div
                            key={station.station_name}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="glass-card"
                            whileHover={{ y: -5, boxShadow: `0 10px 30px -10px ${cardColor}40` }}
                            style={{
                                padding: '0',
                                overflow: 'hidden',
                                borderTop: `4px solid ${cardColor}`,
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
                                            background: cardColor,
                                            color: '#fff',
                                            fontWeight: 800,
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '1.1rem',
                                            boxShadow: `0 0 20px ${cardColor}50`,
                                            minWidth: '40px',
                                            textAlign: 'center'
                                        }}>
                                            #{index + 1}
                                        </div>
                                        <div className="flex-col" style={{ gap: '0.25rem' }}>
                                            <div style={{
                                                fontSize: '1.1rem',
                                                color: 'var(--text-primary)',
                                                fontWeight: 700
                                            }}>
                                                {station.station_name}
                                            </div>
                                            <div className="flex-row gap-sm items-center" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                <span className="flex-row items-center gap-xs"><TrendingUp size={12} /> Pain Score: {Math.round(station.pain_score)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {isHighPain && (
                                        <div className="bg-danger-10 text-danger border border-danger-20 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                            <AlertOctagon size={12} /> High Load
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div style={{ padding: '1rem 1.25rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                                    {/* Avg Delay */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div className="flex-row items-center gap-xs" style={{ marginBottom: '0.5rem' }}>
                                            <Clock size={12} color={cardColor} />
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ø Delay</span>
                                        </div>
                                        <div className="flex-row items-end gap-sm">
                                            <span className="font-bold text-danger" style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                                {station.avg_delay.toFixed(1)}m
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                                            Max: <span className="text-danger">{station.max_delay}m</span>
                                        </div>
                                    </div>

                                    {/* Punctuality */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div className="flex-row items-center gap-xs" style={{ marginBottom: '0.5rem' }}>
                                            <CheckCircle size={12} color={station.punctuality >= 80 ? 'var(--success)' : 'var(--warning)'} />
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pünktlichkeit</span>
                                        </div>
                                        <div className="flex-row items-end gap-sm">
                                            <span className={`font-bold ${station.punctuality >= 80 ? 'text-success' : 'text-warning'}`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                                {Math.round(station.punctuality)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Trains/Cancellations */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div className="flex-row items-center gap-xs" style={{ marginBottom: '0.5rem' }}>
                                            <Train size={12} color="var(--text-primary)" />
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Verkehr</span>
                                        </div>
                                        <div className="flex-col">
                                            <div className="font-bold text-white leading-none mb-1" style={{ fontSize: '1.2rem' }}>
                                                {station.total_trains}
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                                                Züge gesamt
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                            Ausfälle: <span className="text-warning">{station.cancelled}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sparkline */}
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div className="flex-row justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                            Verspätung (0-23 Uhr)
                                        </span>
                                    </div>
                                    <Sparkline data={station.hourly_delays} color={cardColor} height={40} />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
