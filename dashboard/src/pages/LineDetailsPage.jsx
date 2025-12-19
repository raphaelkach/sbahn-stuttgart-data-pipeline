import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, MapPin, Train, Calendar, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { getLineColor } from '../utils/lineColors';

const API_BASE = 'http://localhost:8000/api';

// Sparkline Component
function Sparkline({ data, color, height = 40 }) {
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
                <linearGradient id={`spark-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
            </defs>
            <polygon points={`0,100 ${points} 100,100`} fill={`url(#spark-${color.replace('#', '')})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

export default function LineDetailsPage() {
    const { t } = useLanguage();
    const { id } = useParams();
    const [details, setDetails] = useState(null);
    const [stations, setStations] = useState([]);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterTimeRange, setFilterTimeRange] = useState("all");
    const [filterDate, setFilterDate] = useState("");
    const [direction, setDirection] = useState('forward'); // 'forward' or 'reverse'
    const [selectedStation, setSelectedStation] = useState(null); // Station selected for detail view

    // Get displayed stations based on direction
    const displayedStations = direction === 'forward' ? stations : [...stations].reverse();

    const lineColor = getLineColor(id);

    useEffect(() => {
        Promise.all([
            fetch(`${API_BASE}/lines/${id}/details`).then(res => res.json()),
            fetch(`${API_BASE}/lines/${id}/stations`).then(res => res.json()),
            fetch(`${API_BASE}/lines/${id}/schedule`).then(res => res.json())
        ]).then(([detailsData, stationsData, scheduleData]) => {
            setDetails(detailsData);
            setStations(stationsData);
            setSchedule(scheduleData);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to fetch:", err);
            setLoading(false);
        });
    }, [id]);

    const filteredSchedule = schedule.filter(s => {
        const date = new Date(s.planned_arrival);
        if (filterDate && !s.planned_arrival.includes(filterDate)) return false;
        if (filterTimeRange !== 'all') {
            const hour = date.getHours();
            if (filterTimeRange === 'morning' && (hour < 6 || hour >= 12)) return false;
            if (filterTimeRange === 'afternoon' && (hour < 12 || hour >= 18)) return false;
            if (filterTimeRange === 'evening' && hour < 18) return false;
        }
        return true;
    });

    if (loading) {
        return <div className="flex-row justify-center items-center" style={{ height: '50vh' }}>
            <Train className="animate-spin" size={48} color={lineColor} />
        </div>;
    }

    return (
        <div className="flex-col gap-lg animate-fade-in">
            {/* Back Link */}
            <Link to="/lines" className="flex-row gap-xs items-center text-secondary" style={{ textDecoration: 'none', transition: 'color 0.2s' }}>
                <ArrowLeft size={16} /> {t('lines.details.back')}
            </Link>

            {/* Main Overview Card - Matches LinesPage style */}
            <motion.div
                className="glass-card"
                style={{
                    padding: '0',
                    overflow: 'hidden',
                    borderTop: `4px solid ${lineColor}`,
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
                                background: lineColor,
                                color: '#fff',
                                fontWeight: 800,
                                padding: '0.6rem 1.2rem',
                                borderRadius: '0.5rem',
                                fontSize: '1.5rem',
                                boxShadow: `0 0 25px ${lineColor}50`
                            }}>
                                {id}
                            </div>
                            <div className="flex-col" style={{ gap: '0.25rem' }}>
                                <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                    {details?.start_station} ↔ {details?.end_station}
                                </div>
                                <div className="flex-row gap-sm items-center" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    <span className="flex-row items-center gap-xs"><MapPin size={10} /> {details?.total_stations} Stationen</span>
                                    <span style={{ opacity: 0.3 }}>|</span>
                                    <span>{details?.total_trips?.toLocaleString()} Fahrten</span>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-full font-bold uppercase tracking-wide border px-3 py-1 ${details?.avg_delay >= 6
                            ? 'text-danger border-danger-20 bg-danger-10'
                            : 'text-success border-success-20 bg-success-10'
                            }`} style={{ fontSize: '0.65rem' }}>
                            {details?.avg_delay >= 6 ? 'Verspätet' : 'Pünktlich'}
                        </div>
                    </div>
                </div>

                {/* 3-Box KPIs */}
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
                                <CheckCircle size={12} color={details?.punctuality >= 50 ? 'var(--success)' : 'var(--warning)'} />
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pünktlichkeit</span>
                            </div>
                            <div className="flex-row items-end gap-sm">
                                <span className={`font-bold ${details?.punctuality >= 50 ? 'text-success' : 'text-warning'}`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                    {Math.round(details?.punctuality || 0)}%
                                </span>
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                Mo-Fr: <span className={details?.weekday_punctuality >= 40 ? 'text-success' : 'text-warning'}>{details?.weekday_punctuality}%</span>
                                <span style={{ margin: '0 0.3rem', opacity: 0.3 }}>|</span>
                                Sa-So: <span className={details?.weekend_punctuality >= 50 ? 'text-success' : 'text-warning'}>{details?.weekend_punctuality}%</span>
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
                                <Clock size={12} color={lineColor} />
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ø Verspätung</span>
                            </div>
                            <div className="flex-row items-end gap-sm">
                                <span className={`font-bold ${details?.avg_delay >= 6 ? 'text-danger' : 'text-primary'}`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                    {details?.avg_delay?.toFixed(1)}m
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '0.1rem' }}>
                                    / {details?.median_delay?.toFixed(1)}m median
                                </span>
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                Max: <span className="text-danger">{details?.max_delay}m</span>
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
                                <span className={`font-bold ${details?.cancelled_rate > 5 ? 'text-danger' : 'text-secondary'}`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                    {details?.cancelled_rate?.toFixed(1)}%
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '0.1rem' }}>
                                    ({details?.cancelled} Fahrten)
                                </span>
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
                                Verspätung nach Tageszeit (0-23 Uhr)
                            </span>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                Peak: {details?.peak_hour}:00 Uhr ({details?.peak_value}m)
                            </span>
                        </div>
                        <Sparkline data={details?.hourly_delays} color={lineColor} height={40} />
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
                        <span style={{ opacity: 0.6 }}>Erste Fahrt:</span> <span className="text-primary">{details?.first_departure?.split('T')[1]?.slice(0, 5)}</span>
                    </div>
                    <div>
                        <span style={{ opacity: 0.6 }}>Letzte Fahrt:</span> <span className="text-primary">{details?.last_arrival?.split('T')[1]?.slice(0, 5)}</span>
                    </div>
                    <div>
                        <span style={{ opacity: 0.6 }}>Fahrten gesamt:</span> <span className="text-primary">{details?.total_trips?.toLocaleString()}</span>
                    </div>
                </div>
            </motion.div>

            {/* Filters */}
            <div className="flex-row gap-md justify-end">
                <div className="glass-card flex-row items-center gap-sm" style={{ padding: '0.5rem 1rem' }}>
                    <Clock size={16} className="text-secondary" />
                    <select
                        value={filterTimeRange}
                        onChange={(e) => setFilterTimeRange(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                        <option value="all">{t('lines.details.filter.allDay')}</option>
                        <option value="morning">{t('lines.details.filter.morning')}</option>
                        <option value="afternoon">{t('lines.details.filter.afternoon')}</option>
                        <option value="evening">{t('lines.details.filter.evening')}</option>
                    </select>
                </div>
                <div className="glass-card flex-row items-center gap-sm" style={{ padding: '0.5rem 1rem' }}>
                    <Calendar size={16} className="text-secondary" />
                    <input
                        type="date"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid-cols-2" style={{ alignItems: 'start', gap: '1.5rem' }}>
                {/* Premium Station Timeline */}
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    {/* Header with Direction Toggle */}
                    <div style={{
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: `linear-gradient(135deg, ${lineColor}15, transparent)`
                    }}>
                        <div className="flex-row justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{t('lines.details.stationsRoute')}</h3>
                            <div className="flex-row gap-sm items-center" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span> Pünktlich
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></span> Leicht
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }}></span> Stark
                            </div>
                        </div>

                        {/* Direction Selector */}
                        <div style={{
                            display: 'flex',
                            background: 'rgba(15, 23, 42, 0.6)',
                            borderRadius: '0.5rem',
                            padding: '0.25rem',
                            gap: '0.25rem'
                        }}>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setDirection('forward')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.4rem',
                                    border: 'none',
                                    background: direction === 'forward' ? lineColor : 'transparent',
                                    color: direction === 'forward' ? '#fff' : 'var(--text-secondary)',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '0.8rem' }}>→</span>
                                <span style={{
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {stations[stations.length - 1]?.station_name?.split(' ')[0] || 'Richtung B'}
                                </span>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setDirection('reverse')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.4rem',
                                    border: 'none',
                                    background: direction === 'reverse' ? lineColor : 'transparent',
                                    color: direction === 'reverse' ? '#fff' : 'var(--text-secondary)',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '0.8rem' }}>→</span>
                                <span style={{
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {stations[0]?.station_name?.split(' ')[0] || 'Richtung A'}
                                </span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Timeline Content */}
                    <div style={{ padding: '1rem 1.25rem', maxHeight: '500px', overflowY: 'auto' }}>
                        {displayedStations.map((station, index) => {
                            const isFirst = index === 0;
                            const isLast = index === displayedStations.length - 1;

                            // Get directional stats based on selected direction
                            const dirStopCount = direction === 'forward' ? station.stop_count_forward : station.stop_count_reverse;
                            const dirAvgDelay = direction === 'forward' ? station.avg_delay_forward : station.avg_delay_reverse;
                            const dirPunctuality = direction === 'forward' ? station.punctuality_forward : station.punctuality_reverse;
                            const dirMaxDelay = direction === 'forward' ? station.max_delay_forward : station.max_delay_reverse;
                            const dirCancelled = direction === 'forward' ? station.cancelled_forward : station.cancelled_reverse;

                            const delayLevel = dirAvgDelay >= 6 ? 'high' : dirAvgDelay >= 3 ? 'medium' : 'low';
                            const statusColor = delayLevel === 'high' ? 'var(--danger)' : delayLevel === 'medium' ? 'var(--warning)' : 'var(--success)';
                            const delayWidth = Math.min(100, (dirAvgDelay / 10) * 100);
                            const punctualityWidth = dirPunctuality;

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    style={{ display: 'flex', alignItems: 'stretch', minHeight: isFirst || isLast ? '5rem' : '4.5rem' }}
                                >
                                    {/* Beautiful Timeline Track */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        marginRight: '1rem',
                                        width: '40px',
                                        flexShrink: 0
                                    }}>
                                        {/* Top Connector */}
                                        {!isFirst && (
                                            <div style={{
                                                width: '3px',
                                                height: '1rem',
                                                background: `linear-gradient(to bottom, ${lineColor}40, ${statusColor})`,
                                                borderRadius: '2px 2px 0 0'
                                            }} />
                                        )}

                                        {/* Station Node */}
                                        <motion.div
                                            whileHover={{ scale: 1.3 }}
                                            style={{
                                                width: isFirst || isLast ? '24px' : '18px',
                                                height: isFirst || isLast ? '24px' : '18px',
                                                borderRadius: '50%',
                                                background: isFirst || isLast
                                                    ? `linear-gradient(135deg, ${lineColor}, ${lineColor}99)`
                                                    : 'var(--bg-card)',
                                                border: isFirst || isLast ? 'none' : `4px solid ${statusColor}`,
                                                boxShadow: `0 0 ${isFirst || isLast ? '20px' : '12px'} ${isFirst || isLast ? lineColor : statusColor}60`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 10,
                                                position: 'relative'
                                            }}
                                        >
                                            {(isFirst || isLast) && (
                                                <span style={{
                                                    color: '#fff',
                                                    fontSize: '0.6rem',
                                                    fontWeight: 800
                                                }}>
                                                    {isFirst ? 'A' : 'E'}
                                                </span>
                                            )}
                                            {/* Pulse effect for delayed stations */}
                                            {delayLevel === 'high' && !isFirst && !isLast && (
                                                <motion.div
                                                    animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    style={{
                                                        position: 'absolute',
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRadius: '50%',
                                                        border: `2px solid ${statusColor}`,
                                                        pointerEvents: 'none'
                                                    }}
                                                />
                                            )}
                                        </motion.div>

                                        {/* Bottom Connector */}
                                        {!isLast && (
                                            <div style={{
                                                width: '3px',
                                                flexGrow: 1,
                                                background: `linear-gradient(to bottom, ${statusColor}, ${lineColor}40)`,
                                                minHeight: '2rem',
                                                borderRadius: '0 0 2px 2px'
                                            }} />
                                        )}
                                    </div>

                                    {/* Station Card */}
                                    <motion.div
                                        whileHover={{ scale: 1.01, x: 5 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setSelectedStation(station)}
                                        transition={{ type: 'spring', stiffness: 400 }}
                                        style={{
                                            flex: 1,
                                            padding: '0.8rem 1rem',
                                            marginBottom: '0.4rem',
                                            background: selectedStation?.station_name === station.station_name
                                                ? `linear-gradient(135deg, ${lineColor}35, ${lineColor}15)`
                                                : isFirst || isLast
                                                    ? `linear-gradient(135deg, ${lineColor}20, ${lineColor}05)`
                                                    : 'rgba(255,255,255,0.02)',
                                            borderRadius: '0.75rem',
                                            border: selectedStation?.station_name === station.station_name
                                                ? `2px solid ${lineColor}`
                                                : isFirst || isLast
                                                    ? `1px solid ${lineColor}40`
                                                    : '1px solid rgba(255,255,255,0.03)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {/* Subtle glow for terminals */}
                                        {(isFirst || isLast) && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                right: 0,
                                                width: '100px',
                                                height: '100%',
                                                background: `linear-gradient(to left, ${lineColor}10, transparent)`,
                                                pointerEvents: 'none'
                                            }} />
                                        )}

                                        {/* Header Row */}
                                        <div className="flex-row justify-between items-start" style={{ marginBottom: '0.6rem' }}>
                                            <div>
                                                <div style={{
                                                    fontWeight: isFirst || isLast ? 700 : 600,
                                                    fontSize: isFirst || isLast ? '0.95rem' : '0.85rem',
                                                    color: isFirst || isLast ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                    marginBottom: '0.15rem'
                                                }}>
                                                    {station.station_name}
                                                </div>
                                                {(isFirst || isLast) && (
                                                    <span style={{
                                                        fontSize: '0.55rem',
                                                        color: lineColor,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px',
                                                        fontWeight: 600
                                                    }}>
                                                        {isFirst ? '● Startstation' : '○ Endstation'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Delay Badge */}
                                            <div style={{
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '1rem',
                                                background: delayLevel === 'high'
                                                    ? 'rgba(239, 68, 68, 0.15)'
                                                    : delayLevel === 'medium'
                                                        ? 'rgba(245, 158, 11, 0.15)'
                                                        : 'rgba(34, 197, 94, 0.15)',
                                                border: `1px solid ${statusColor}40`,
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                color: statusColor
                                            }}>
                                                {dirAvgDelay > 0 ? `+${dirAvgDelay.toFixed(1)}m` : '✓'}
                                            </div>
                                        </div>

                                        {/* Visual Stats Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            {/* Delay Bar */}
                                            <div>
                                                <div className="flex-row justify-between" style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                                    <span>Ø Verspätung</span>
                                                    <span>{dirAvgDelay?.toFixed(1)}m</span>
                                                </div>
                                                <div style={{
                                                    height: '6px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${delayWidth}%` }}
                                                        transition={{ delay: index * 0.03, duration: 0.5 }}
                                                        style={{
                                                            height: '100%',
                                                            background: `linear-gradient(90deg, ${statusColor}, ${statusColor}80)`,
                                                            borderRadius: '3px'
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Punctuality Bar */}
                                            <div>
                                                <div className="flex-row justify-between" style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                                    <span>Pünktlichkeit</span>
                                                    <span className={dirPunctuality >= 40 ? 'text-success' : 'text-warning'}>{dirPunctuality}%</span>
                                                </div>
                                                <div style={{
                                                    height: '6px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${punctualityWidth}%` }}
                                                        transition={{ delay: index * 0.03, duration: 0.5 }}
                                                        style={{
                                                            height: '100%',
                                                            background: dirPunctuality >= 40
                                                                ? 'linear-gradient(90deg, var(--success), var(--success-light, #4ade80))'
                                                                : 'linear-gradient(90deg, var(--warning), var(--warning-light, #fbbf24))',
                                                            borderRadius: '3px'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer Stats */}
                                        <div className="flex-row gap-md justify-between" style={{ marginTop: '0.5rem', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                                            <div className="flex-row gap-sm">
                                                <span>{dirStopCount?.toLocaleString()} Halte</span>
                                                <span>Max: <span className="text-danger">{dirMaxDelay}m</span></span>
                                            </div>
                                            {dirCancelled > 0 && (
                                                <span style={{
                                                    color: 'var(--danger)',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem'
                                                }}>
                                                    <XCircle size={11} />
                                                    {dirCancelled} Ausfälle
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Station Detail Panel */}
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    {selectedStation ? (
                        <motion.div
                            key={selectedStation.station_name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Header with close button */}
                            <div className="flex-row justify-between items-center" style={{ marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                        {selectedStation.station_name}
                                    </h3>
                                    <span style={{ fontSize: '0.7rem', color: lineColor }}>Stationsdetails</span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setSelectedStation(null)}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                    ✕
                                </motion.button>
                            </div>

                            {/* Direction Comparison */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.75rem',
                                marginBottom: '1rem'
                            }}>
                                {/* Forward Direction */}
                                <div style={{
                                    padding: '0.75rem',
                                    background: direction === 'forward' ? `${lineColor}20` : 'rgba(255,255,255,0.03)',
                                    borderRadius: '0.5rem',
                                    border: direction === 'forward' ? `1px solid ${lineColor}40` : '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        → {displayedStations[displayedStations.length - 1]?.station_name}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.7rem' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>Halte</div>
                                            <div style={{ fontWeight: 600 }}>{selectedStation.stop_count_forward?.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>Ø Delay</div>
                                            <div style={{ fontWeight: 600, color: selectedStation.avg_delay_forward >= 6 ? 'var(--danger)' : selectedStation.avg_delay_forward >= 3 ? 'var(--warning)' : 'var(--success)' }}>
                                                {selectedStation.avg_delay_forward?.toFixed(1)}m
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>Pünktlichkeit</div>
                                            <div style={{ fontWeight: 600, color: selectedStation.punctuality_forward >= 40 ? 'var(--success)' : 'var(--warning)' }}>
                                                {selectedStation.punctuality_forward}%
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>Ausfälle</div>
                                            <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{selectedStation.cancelled_forward}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Reverse Direction */}
                                <div style={{
                                    padding: '0.75rem',
                                    background: direction === 'reverse' ? `${lineColor}20` : 'rgba(255,255,255,0.03)',
                                    borderRadius: '0.5rem',
                                    border: direction === 'reverse' ? `1px solid ${lineColor}40` : '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        → {displayedStations[0]?.station_name}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.7rem' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>Halte</div>
                                            <div style={{ fontWeight: 600 }}>{selectedStation.stop_count_reverse?.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>Ø Delay</div>
                                            <div style={{ fontWeight: 600, color: selectedStation.avg_delay_reverse >= 6 ? 'var(--danger)' : selectedStation.avg_delay_reverse >= 3 ? 'var(--warning)' : 'var(--success)' }}>
                                                {selectedStation.avg_delay_reverse?.toFixed(1)}m
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>Pünktlichkeit</div>
                                            <div style={{ fontWeight: 600, color: selectedStation.punctuality_reverse >= 40 ? 'var(--success)' : 'var(--warning)' }}>
                                                {selectedStation.punctuality_reverse}%
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>Ausfälle</div>
                                            <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{selectedStation.cancelled_reverse}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Trains at this station */}
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    Letzte Züge an dieser Station
                                </div>
                                <div className="flex-col gap-sm" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                    {filteredSchedule
                                        .filter(s => s.station_name === selectedStation.station_name)
                                        .slice(0, 20)
                                        .map((stop, i) => {
                                            const isDelayed = stop.arrival_delay_m > 3;
                                            return (
                                                <motion.div
                                                    key={i}
                                                    whileHover={{ x: 3 }}
                                                    style={{
                                                        padding: '0.6rem 0.75rem',
                                                        background: 'rgba(15, 23, 42, 0.4)',
                                                        borderRadius: '0.5rem',
                                                        borderLeft: `3px solid ${isDelayed ? 'var(--danger)' : 'var(--success)'}`
                                                    }}
                                                >
                                                    <div className="flex-row justify-between items-center">
                                                        <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            <Train size={12} />
                                                            {stop.start_station} → {stop.end_station}
                                                        </span>
                                                        <span style={{
                                                            color: isDelayed ? 'var(--danger)' : 'var(--success)',
                                                            fontWeight: 700,
                                                            fontSize: '0.7rem'
                                                        }}>
                                                            {stop.arrival_delay_m > 0 ? `+${stop.arrival_delay_m}m` : '✓'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                        {new Date(stop.planned_arrival).toLocaleString('de-DE', {
                                                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    {filteredSchedule.filter(s => s.station_name === selectedStation.station_name).length === 0 && (
                                        <div className="text-secondary text-center" style={{ padding: '1rem', fontSize: '0.75rem' }}>
                                            Keine Zugdaten für diese Station
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '400px',
                            color: 'var(--text-muted)',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: `${lineColor}20`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1rem'
                            }}>
                                <MapPin size={28} style={{ color: lineColor }} />
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                Station auswählen
                            </div>
                            <div style={{ fontSize: '0.75rem', maxWidth: '200px' }}>
                                Klicken Sie auf eine Station im Streckenverlauf für detaillierte Informationen
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
