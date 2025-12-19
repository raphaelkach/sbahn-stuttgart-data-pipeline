
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    // Read from localStorage or default to 'de' (German is requested)
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('app-language') || 'de';
    });

    useEffect(() => {
        localStorage.setItem('app-language', language);
    }, [language]);

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'de' : 'en');
    };

    // Helper to get nested keys, e.g. t('dashboard.title')
    const t = (path) => {
        const keys = path.split('.');
        let current = translations[language];

        for (const key of keys) {
            if (current[key] === undefined) {
                console.warn(`Missing translation for key: ${path} in language: ${language}`);
                return path;
            }
            current = current[key];
        }
        return current;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
