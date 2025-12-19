
import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Filter, X, RotateCcw, Map as MapIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

import { LINE_COLORS } from '../utils/lineColors';

const API_BASE = 'http://localhost:8000/api';

export default function NetworkMapPage() {
    const { t } = useLanguage();
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [filteredData, setFilteredData] = useState({ nodes: [], links: [] });
    const [minTraffic, setMinTraffic] = useState(50); // Default lower to show more nodes initially
    const [selectedLines, setSelectedLines] = useState(Object.keys(LINE_COLORS)); // Default all lines
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const fgRef = useRef();

    useEffect(() => {
        const baseUrl = import.meta.env.VITE_API_BASE || API_BASE;
        fetch(`${baseUrl}/network`)
            .then(res => res.json())
            .then(data => {
                // Pre-process nodes for color
                data.nodes.forEach(node => {
                    // Determine dominant line or 'hub'
                    // For visualization, if multiple lines, maybe white?
                    if (node.lines.length > 2) {
                        node.color = "#ffffff"; // Hub
                        node.val = Math.sqrt(node.value) * 2; // Bigger hubs
                    } else {
                        const line = node.lines[0]; // Simplification
                        node.color = LINE_COLORS[line] || "#64748b";
                        node.val = Math.sqrt(node.value) * 1.5;
                    }
                });

                // Color links
                data.links.forEach(link => {
                    link.color = LINE_COLORS[link.line] || "#64748b";
                });

                setGraphData(data);
                // Initial filter will trigger via dependency
            });
    }, []);

    // Calculate container dimensions for the graph
    const [dimensions, setDimensions] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 800,
        height: typeof window !== 'undefined' ? window.innerHeight : 600
    });
    const containerRef = useRef(null);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                if (clientWidth > 0 && clientHeight > 0) {
                    setDimensions({
                        width: clientWidth,
                        height: clientHeight
                    });
                }
            }
        };

        // Initial measurement
        updateDimensions();

        // Listen for resizing
        const resizeObserver = new ResizeObserver(() => {
            updateDimensions();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    // Effect to filter data based on controls
    useEffect(() => {
        if (!graphData.nodes.length) return;

        // 1. Filter Nodes by Traffic
        const visibleNodes = graphData.nodes.filter(n => n.value >= minTraffic);
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

        // 2. Filter Links
        const visibleLinks = graphData.links.filter(link => {
            if (!selectedLines.includes(link.line)) return false;

            // ForceGraph might mutate link.source to object, check ID if so
            const sId = typeof link.source === 'object' ? link.source.id : link.source;
            const tId = typeof link.target === 'object' ? link.target.id : link.target;

            return visibleNodeIds.has(sId) && visibleNodeIds.has(tId);
        });

        // Add colors to links if missing (sometimes force graph re-fetches)
        visibleLinks.forEach(link => {
            if (!link.color) link.color = LINE_COLORS[link.line] || "#64748b";
        });

        setFilteredData({ nodes: visibleNodes, links: visibleLinks });
    }, [graphData, minTraffic, selectedLines]);

    const handleNodeClick = node => {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(3, 2000);
    };

    const toggleLine = (line) => {
        setSelectedLines(prev =>
            prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
        );
    };

    return (
        <div
            className="w-full relative glass-card animate-fade-in"
            style={{
                height: 'calc(100vh - 180px)',
                overflow: 'hidden',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)'
            }}
        >
            {/* Map Container */}
            <div ref={containerRef} className="absolute-inset z-0" style={{ background: 'rgba(15, 23, 42, 0.3)' }}>
                {filteredData.nodes.length > 0 && (
                    <ForceGraph2D
                        ref={fgRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={filteredData}
                        nodeLabel="id"
                        nodeColor="color"
                        nodeVal="val"
                        linkColor="color"
                        linkWidth={2}
                        linkDirectionalArrowLength={3.5}
                        linkDirectionalArrowRelPos={1}
                        linkCurvature={0.25}
                        backgroundColor="rgba(0,0,0,0)"
                        onNodeClick={handleNodeClick}
                        cooldownTicks={100}
                        d3AlphaDecay={0.01}
                        d3VelocityDecay={0.3}
                        onEngineStop={() => fgRef.current.zoomToFit(400, 50)}
                        className="cursor-crosshair"
                        nodeCanvasObject={(node, ctx, globalScale) => {
                            const label = node.id;
                            const fontSize = 12 / globalScale;
                            const isHub = node.lines && node.lines.length > 1;
                            const isMajor = node.value > 1500;

                            ctx.beginPath();
                            ctx.arc(node.x, node.y, isHub ? 4 : 2, 0, 2 * Math.PI, false);
                            ctx.fillStyle = node.color;
                            ctx.fill();

                            if (isHub) {
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
                                ctx.strokeStyle = `rgba(255,255,255,0.3)`;
                                ctx.lineWidth = 0.5;
                                ctx.stroke();
                            }

                            if (isMajor || globalScale > 2) {
                                ctx.font = `600 ${fontSize}px Inter, sans-serif`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillStyle = isHub ? '#f8fafc' : 'rgba(248, 250, 252, 0.7)';
                                ctx.shadowColor = "rgba(0,0,0,0.8)";
                                ctx.shadowBlur = 4;
                                ctx.fillText(label, node.x, node.y + (isHub ? 10 : 7));
                                ctx.shadowBlur = 0;
                            }
                        }}
                    />
                )}
            </div>

            {/* Overlays Wrapper */}
            <div className="absolute-inset z-10 pointer-events-none p-6 flex-col justify-between">

                {/* Top Header */}
                <div className="flex-row justify-between items-start">
                    <div className="glass-card pointer-events-auto p-4" style={{ backdropFilter: 'blur(24px)' }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            marginBottom: '0.25rem',
                            background: 'linear-gradient(to right, #60a5fa, #818cf8)',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent'
                        }}>
                            {t('map.topoTitle')}
                        </h2>
                        <div className="text-xs text-secondary font-medium">
                            {t('map.topoSubtitle')} ({filteredData.nodes.length})
                        </div>
                    </div>

                    <button
                        onClick={() => setIsPanelOpen(!isPanelOpen)}
                        className="btn-icon pointer-events-auto"
                        style={{
                            background: isPanelOpen ? 'var(--text-primary)' : undefined,
                            color: isPanelOpen ? 'var(--bg-dark)' : undefined
                        }}
                    >
                        {isPanelOpen ? <X size={20} /> : <Filter size={20} />}
                    </button>
                </div>

                {/* Legend */}
                <div className="glass-card pointer-events-auto p-4" style={{ width: '180px', maxHeight: '30vh', overflowY: 'auto' }}>
                    <div className="text-xs text-muted font-bold uppercase mb-4 flex-row items-center gap-xs">
                        <MapIcon size={12} />
                        {t('map.legend')}
                    </div>
                    <div className="flex-col gap-xs">
                        {Object.entries(LINE_COLORS).map(([line, color]) => (
                            <div key={line} className="flex-row items-center gap-sm text-xs text-secondary">
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }}></span>
                                <span className="font-medium" style={{ fontFamily: 'monospace' }}>{line}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className={`sidebar-panel ${isPanelOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <Filter size={18} className="text-accent-primary" style={{ color: 'var(--accent-primary)' }} />
                    {t('map.settings.title')}
                </div>

                <div className="sidebar-content">
                    {/* Settings Content */}
                    <div className="control-group">
                        <div className="control-label">
                            <label>{t('map.settings.minTraffic')}</label>
                            <span style={{
                                color: 'var(--accent-primary)',
                                fontFamily: 'monospace',
                                background: 'rgba(56, 189, 248, 0.1)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(56, 189, 248, 0.2)'
                            }}>
                                {minTraffic}+ {t('map.settings.trains')}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="2000"
                            step="10"
                            value={minTraffic}
                            onChange={(e) => setMinTraffic(Number(e.target.value))}
                            className="range-input"
                        />
                        <p className="text-xs text-muted">
                            {t('map.settings.adjustHint')}
                        </p>
                    </div>

                    <div className="control-group">
                        <div className="control-label">
                            <label>{t('map.settings.visibleLines')}</label>
                            <button
                                onClick={() => {
                                    setMinTraffic(50);
                                    setSelectedLines(Object.keys(LINE_COLORS));
                                }}
                                className="flex-row gap-xs items-center"
                                style={{
                                    textTransform: 'none',
                                    cursor: 'pointer',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.7rem'
                                }}
                            >
                                <RotateCcw size={10} />
                                {t('map.settings.reset')}
                            </button>
                        </div>

                        <div className="pill-grid">
                            {Object.keys(LINE_COLORS).map(line => (
                                <button
                                    key={line}
                                    onClick={() => toggleLine(line)}
                                    className={`line-toggle-btn ${selectedLines.includes(line) ? 'active' : ''}`}
                                >
                                    <div
                                        className="line-dot"
                                        style={{ backgroundColor: LINE_COLORS[line], opacity: selectedLines.includes(line) ? 1 : 0.3 }}
                                    />
                                    {line}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
