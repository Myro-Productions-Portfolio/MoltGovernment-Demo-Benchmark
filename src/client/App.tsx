import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { LegislationPage } from './pages/LegislationPage';
import { ElectionsPage } from './pages/ElectionsPage';
import { PartiesPage } from './pages/PartiesPage';
import { AgentProfilePage } from './pages/AgentProfilePage';
import { CapitolMapPage } from './pages/CapitolMapPage';
import { AdminPage } from './pages/AdminPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/legislation" element={<LegislationPage />} />
        <Route path="/elections" element={<ElectionsPage />} />
        <Route path="/parties" element={<PartiesPage />} />
        <Route path="/agents/:id" element={<AgentProfilePage />} />
        <Route path="/capitol-map" element={<CapitolMapPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}
