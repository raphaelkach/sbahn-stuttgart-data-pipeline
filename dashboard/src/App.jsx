
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import LinesPage from './pages/LinesPage';
import LineDetailsPage from './pages/LineDetailsPage';
import BottlenecksPage from './pages/BottlenecksPage';
import NetworkMapPage from './pages/NetworkMapPage';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/lines" element={<LinesPage />} />
            <Route path="/lines/:id" element={<LineDetailsPage />} />
            <Route path="/bottlenecks" element={<BottlenecksPage />} />
            <Route path="/map" element={<NetworkMapPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LanguageProvider>
  );
}
