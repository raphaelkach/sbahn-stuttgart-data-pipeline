
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, TrendingUp, Share2, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

function NavItem({ to, icon, label }) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link to={to} style={{ textDecoration: 'none' }}>
            <div
                className={`flex-row items-center gap-sm`}
                style={{
                    padding: '0.6rem 1rem',
                    background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                    borderRadius: 'var(--radius-md)',
                    border: isActive ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid transparent',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease'
                }}
            >
                {icon}
                <span style={{ fontWeight: isActive ? 600 : 500, fontSize: '0.925rem' }}>{label}</span>
            </div>
        </Link>
    );
}

export default function Layout({ children }) {
    const { language, toggleLanguage, t } = useLanguage();

    return (
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Navigation Bar */}
            <nav className="glass-card flex-row items-center justify-between" style={{ padding: '0.75rem 1.5rem', marginBottom: '2rem' }}>
                <div className="flex-row items-center gap-md">
                    {/* Logo / Title */}
                    <div style={{
                        fontWeight: 800,
                        fontSize: '1.5rem',
                        background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        letterSpacing: '-0.03em'
                    }}>
                        {t('nav.title')}
                    </div>
                </div>

                <div className="flex-row gap-lg">
                    {/* Nav Links */}
                    <div className="flex-row gap-xs">
                        <NavItem to="/" icon={<LayoutDashboard size={18} />} label={t('nav.overview')} />
                        <NavItem to="/lines" icon={<Map size={18} />} label={t('nav.lines')} />
                        <NavItem to="/bottlenecks" icon={<TrendingUp size={18} />} label={t('nav.bottlenecks')} />
                        <NavItem to="/map" icon={<Share2 size={18} />} label={t('nav.map')} />
                    </div>

                    {/* Language Switcher */}
                    <button
                        onClick={toggleLanguage}
                        className="flex-row items-center gap-xs hoverable"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.5rem 0.75rem',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 600
                        }}
                    >
                        <Globe size={16} />
                        <span>{language.toUpperCase()}</span>
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="animate-fade-in" style={{ flex: 1 }}>
                {children}
            </main>

        </div>
    );
}
