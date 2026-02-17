import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { LegislationPage } from './pages/LegislationPage';
import { ElectionsPage } from './pages/ElectionsPage';
import { PartiesPage } from './pages/PartiesPage';
import { AgentProfilePage } from './pages/AgentProfilePage';
import { CapitolMapPage } from './pages/CapitolMapPage';
import { BuildingInteriorPage } from './pages/BuildingInteriorPage';
import { AdminPage } from './pages/AdminPage';
import { CalendarPage } from './pages/CalendarPage';

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
        <Route path="/capitol-map/:buildingId" element={<BuildingInteriorPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Route>
    </Routes>
  );
}
