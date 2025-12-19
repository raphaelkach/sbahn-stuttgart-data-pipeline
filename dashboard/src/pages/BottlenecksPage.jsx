
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Clock, Activity, TrendingUp, AlertOctagon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const API_BASE = 'http://localhost:8000/api';

export default function BottlenecksPage() {
    const { t } = useLanguage();
    const [bottlenecks, setBottlenecks] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [hourlyData, setHourlyData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/bottlenecks`)
            .then(res => res.json())
            .then(data => {
                setBottlenecks(data);
                if (data.length > 0) setSelectedStation(data[0]);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (selectedStation) {
            fetch(`${API_BASE}/stations/${selectedStation.station_name}/hourly`)
                .then(res => res.json())
                .then(data => setHourlyData(data))
                .catch(err => console.error(err));
        }
    }, [selectedStation]);

    if (loading) {
        return <div className="flex-row justify-center items-center" style={{ height: '50vh' }}>
            <Activity className="animate-spin text-accent-primary" size={48} />
        </div>;
    }

    const top3 = bottlenecks.slice(0, 3);
    const rest = bottlenecks.slice(3);

    const PodiumStep = ({ station, place }) => {
        const height = place === 1 ? '300px' : place === 2 ? '260px' : '230px';
        const color = place === 1 ? '#fbbf24' : place === 2 ? '#94a3b8' : '#b45309'; // Gold, Silver, Bronze
        const glow = place === 1 ? '0 0 40px rgba(251, 191, 36, 0.4)' : 'none';

        if (!station) return null;

        return (
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + (place * 0.1) }}
                className="flex-col items-center justify-end"
                style={{ width: '30%' }}
            >
                <div className="flex-col items-center mb-4 text-center">
                    <div className="text-2xl font-black mb-2" style={{ color }}>#{place}</div>
                    <div className="font-bold text-lg leading-tight">{station.station_name}</div>
                    <div className="text-secondary text-sm mt-1">{station.avg_delay.toFixed(2)} min avg</div>
                </div>

                <div
                    onClick={() => setSelectedStation(station)}
                    className="glass-card hover:brightness-110 cursor-pointer transition-all"
                    style={{
                        width: '100%',
                        height,
                        background: `linear-gradient(to top, ${color}20, transparent)`,
                        border: `2px solid ${color}`,
                        boxShadow: glow,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: '1.5rem',
                        position: 'relative'
                    }}
                >
                    <div className="flex-col gap-sm">
                        <div className="flex justify-between text-xs uppercase tracking-wider text-secondary">
                            <span>Pain Score</span>
                            <span style={{ color }}>{Math.round(station.pain_score)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-secondary text-sm"><AlertOctagon size={14} /> Max</span>
                            <span className="font-bold text-danger">+{station.max_delay}m</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="flex-col gap-lg pb-10">
            <header className="flex-col gap-xs text-center">
                <h1>{t('bottlenecks.title')}</h1>
                <p className="text-secondary">{t('bottlenecks.subtitle')}</p>
            </header>

            {/* Top 3 Podium */}
            <div className="flex-row justify-center items-end gap-md my-8" style={{ height: '350px' }}>
                <PodiumStep station={top3[1]} place={2} />
                <PodiumStep station={top3[0]} place={1} />
                <PodiumStep station={top3[2]} place={3} />
            </div>

            <div className="grid-cols-2">
                {/* Detailed List */}
                <div className="flex-col gap-md">
                    <h3 className="text-xl font-bold mb-2">{t('bottlenecks.listTitle')}</h3>
                    {rest.map((station, i) => (
                        <motion.div
                            key={station.station_name}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1 * i }}
                            onClick={() => setSelectedStation(station)}
                            className={`glass-card p-4 cursor-pointer flex-row justify-between items-center ${selectedStation?.station_name === station.station_name ? 'ring-2 ring-accent-primary' : ''}`}
                            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.08)' }}
                        >
                            <div className="flex-row items-center gap-md">
                                <div className="text-lg font-bold text-secondary w-8">#{i + 4}</div>
                                <div>
                                    <div className="font-bold text-lg">{station.station_name}</div>
                                    <div className="text-xs text-secondary flex gap-3 mt-1">
                                        <span className="flex items-center gap-1"><TrendingUp size={12} /> {Math.round(station.pain_score)} Pain</span>
                                        <span className="flex items-center gap-1"><Activity size={12} /> {station.total_trains} trains</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-row gap-lg text-right">
                                <div>
                                    <div className="font-bold text-danger text-lg">{station.avg_delay.toFixed(2)}m</div>
                                    <div className="text-xs text-secondary">Avg</div>
                                </div>
                                <div>
                                    <div className="font-bold text-white text-lg">{station.cancelled}</div>
                                    <div className="text-xs text-secondary">Canc</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Analysis Panel */}
                <div className="flex-col gap-md sticky top-6" style={{ height: 'fit-content' }}>
                    {selectedStation && (
                        <motion.div
                            key={selectedStation.station_name}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card p-6 border-t-4 border-accent-primary"
                        >
                            <div className="flex-row justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">{selectedStation.station_name}</h2>
                                    <div className="px-2 py-1 bg-danger-10 text-danger rounded text-xs font-bold inline-block">CRITICAL BOTTLENECK</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-accent-primary">{Math.round(selectedStation.pain_score)}</div>
                                    <div className="text-xs text-secondary uppercase tracking-wider">Pain Score</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-bg-dark p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-danger">{selectedStation.avg_delay.toFixed(2)}m</div>
                                    <div className="text-xs text-secondary">{t('bottlenecks.stats.avgDelay')}</div>
                                </div>
                                <div className="bg-bg-dark p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-white">{selectedStation.max_delay}m</div>
                                    <div className="text-xs text-secondary">{t('bottlenecks.stats.maxDelay')}</div>
                                </div>
                                <div className="bg-bg-dark p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-warning">{selectedStation.cancelled}</div>
                                    <div className="text-xs text-secondary">{t('bottlenecks.stats.cancelled')}</div>
                                </div>
                            </div>

                            <h3 className="mb-4 text-sm uppercase tracking-wider text-secondary">{t('bottlenecks.charts.heatmapTitle')}</h3>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={hourlyData}>
                                        <XAxis dataKey="hour" hide />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                                            formatter={(val) => [`${val.toFixed(2)} min`, 'Delay']}
                                            labelFormatter={(h) => `${h}:00`}
                                        />
                                        <Bar dataKey="avg_delay" fill="var(--danger)" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
