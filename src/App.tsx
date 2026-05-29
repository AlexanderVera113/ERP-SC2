import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import InventoryPage from "./modules/inventory/pages/InventoryPage";
import DashboardPage from "./modules/dashboard/pages/DashboardPage";
import RRHHPage from "./modules/rrhh/pages/RRHHpage";
import SupplyPage from "./modules/supply/pages/SupplyPage";
import AdminPage from "./modules/admin/pages/AdminPage";
import AdminGuard from "./components/AdminGuard";
import DomainGuard from "./components/DomainGuard"; // <-- 1. Importamos el nuevo guardián de dominio
import SSOCallbackPage from "./modules/SSOCallback/pages/SSOCallbackPage";
import RegisterPage from "./modules/Register/pages/Registerpage";

export default function App() {
  return (
    <BrowserRouter>
      <DomainGuard> {/* <-- 2. Envolvemos TODO el Layout dentro del DomainGuard */}
        <MainLayout>
          <Routes>
            <Route path="/sso-callback" element={<SSOCallbackPage />} />
            <Route path="/register" element={<RegisterPage />} />
            {/* Rutas de acceso general (Cualquier empleado logueado con @sc2.cl) */}
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
      </DomainGuard>
    </BrowserRouter>
  );
}