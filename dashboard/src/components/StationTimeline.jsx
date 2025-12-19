
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

export default function StationTimeline({ stations, schedule }) {
    const { t } = useLanguage();

    // Helper to get status color for a station from the schedule
    const getStationStatus = (stationName) => {
        if (!schedule || schedule.length === 0) return 'neutral';

        // Find the latest train arrival for this station in the schedule
        // This is a simplification; ideally we'd look for active trains
        const stop = schedule.find(s => s.station_name === stationName);

        if (!stop) return 'neutral';
        if (stop.arrival_delay_m > 3) return 'delayed';
        return 'ontime';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'delayed': return '#ef4444';
            case 'ontime': return '#22c55e';
            default: return '#94a3b8'; // neutral
        }
    };

    return (
        <div className="flex-col" style={{ position: 'relative', paddingLeft: '1rem', gap: 0 }}>
            {stations.map((station, index) => {
                const isLast = index === stations.length - 1;
                const status = getStationStatus(station);
                const color = getStatusColor(status);

                return (
                    <div key={index} className="flex-row" style={{ alignItems: 'flex-start', minHeight: '3rem' }}>
                        {/* Timeline Graphic */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '1.5rem', height: '100%' }}>
                            {/* Node */}
                            <motion.div
                                initial={{ scale: 0.8 }}
                                whileHover={{ scale: 1.2 }}
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    backgroundColor: '#0f172a',
                                    border: `3px solid ${color}`,
                                    zIndex: 10,
                                    boxShadow: `0 0 10px ${color}40`
                                }}
                            />
                            {/* Connecting Line */}
                            {!isLast && (
                                <div style={{
                                    width: '2px',
                                    flexGrow: 1,
                                    background: 'linear-gradient(to bottom, #334155 50%, #1e293b)',
                                    minHeight: '2.5rem',
                                    marginTop: '-2px',
                                    marginBottom: '-2px'
                                }} />
                            )}
                        </div>

                        {/* Station Info */}
                        <motion.div
                            style={{ paddingTop: '0px', paddingBottom: '1.5rem', width: '100%' }}
                            whileHover={{ x: 5 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: status === 'neutral' ? '#cbd5e1' : '#f8fafc' }}>
                                {station}
                            </div>
                            {status !== 'neutral' && (
                                <div className="text-xs" style={{ color: color, marginTop: '0.2rem' }}>
                                    {status === 'delayed' ? t('lines.timeline.delaysReported') : t('lines.timeline.activeTraffic')}
                                </div>
                            )}
                        </motion.div>
                    </div>
                );
            })}
        </div>
    );
}
