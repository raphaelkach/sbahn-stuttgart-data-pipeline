
import { motion } from 'framer-motion';

export default function KPICard({
    title,
    value,
    icon,
    trend,
    isDanger,
    isSuccess,
    details,
    subValue,
    subLabel,
    sparklineData,
    sparklineColor
}) {
    // Mini inline sparkline
    const renderSparkline = () => {
        if (!sparklineData || sparklineData.length === 0) return null;

        const max = Math.max(...sparklineData, 1);
        const min = Math.min(...sparklineData, 0);
        const range = max - min || 1;
        const color = sparklineColor || 'var(--accent-primary)';

        const points = sparklineData.map((val, i) => {
            const x = (i / (sparklineData.length - 1)) * 100;
            const y = 100 - ((val - min) / range) * 100;
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '24px', opacity: 0.6 }}>
                <defs>
                    <linearGradient id={`kpi-grad-${title?.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                    </linearGradient>
                </defs>
                <polygon points={`0,100 ${points} 100,100`} fill={`url(#kpi-grad-${title?.replace(/\s/g, '')})`} />
                <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
        );
    };

    const getValueColor = () => {
        if (isDanger) return 'var(--danger)';
        if (isSuccess) return 'var(--success)';
        return 'var(--text-primary)';
    };

    return (
        <motion.div
            className="glass-card hoverable"
            whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}
            style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div className="flex-row justify-between items-start">
                <span className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
                <div style={{
                    padding: '0.4rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {icon}
                </div>
            </div>

            {/* Main Value */}
            <div className="flex-row items-end gap-sm">
                <div style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: getValueColor(),
                    lineHeight: 1
                }}>
                    {value}
                </div>
                {subValue && (
                    <div className="flex-col" style={{ paddingBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{subValue}</span>
                        {subLabel && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{subLabel}</span>}
                    </div>
                )}
            </div>

            {/* Details Row */}
            {details && details.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    marginTop: '0.25rem',
                    flexWrap: 'wrap'
                }}>
                    {details.map((detail, i) => (
                        <div key={i} style={{
                            fontSize: '0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}>
                            <span style={{ color: 'var(--text-muted)' }}>{detail.label}:</span>
                            <span style={{
                                fontWeight: 600,
                                color: detail.color || 'var(--text-secondary)'
                            }}>{detail.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Sparkline */}
            {sparklineData && (
                <div style={{ marginTop: 'auto', marginBottom: '-0.5rem', marginLeft: '-1.25rem', marginRight: '-1.25rem' }}>
                    {renderSparkline()}
                </div>
            )}

            {/* Trend/Description */}
            <div className="text-xs text-muted" style={{ marginTop: sparklineData ? '0.5rem' : '0' }}>
                {trend}
            </div>
        </motion.div>
    );
}
