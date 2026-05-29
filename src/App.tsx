import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import InventoryPage from "./modules/inventory/pages/InventoryPage";
import DashboardPage from "./modules/dashboard/pages/DashboardPage";
import RRHHPage from "./modules/rrhh/pages/RRHHpage";
import SupplyPage from "./modules/supply/pages/SupplyPage";
import AdminPage from "./modules/admin/pages/AdminPage";
import AdminGuard from "./components/AdminGuard"; // <-- Importamos el guardia

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          {/* Rutas de acceso general (Cualquier empleado logueado) */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />

          {/* Rutas de acceso restringido (Solo ADMIN) */}
          <Route 
            path="/rrhh" 
            element={
              <AdminGuard>
                <RRHHPage />
              </AdminGuard>
            } 
          />
          <Route 
            path="/supply" 
            element={
              <AdminGuard>
                <SupplyPage />
              </AdminGuard>
            } 
          />
          <Route 
  path="/admin" 
  element={
    <AdminGuard>
      <AdminPage />
    </AdminGuard>
  } 
/>
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}