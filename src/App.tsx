import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import InventoryPage from "./modules/inventory/pages/InventoryPage";
import DashboardPage from "./modules/dashboard/pages/DashboardPage";
import RRHHPage from "./modules/rrhh/pages/RRHHpage";
import SupplyPage from "./modules/supply/pages/SupplyPage";
import AdminPage from "./modules/admin/pages/AdminPage";
import SSOCallbackPage from "./modules/SSOCallback/pages/SSOCallbackPage";
import RegisterPage from "./modules/Register/pages/Registerpage";

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/sso-callback" element={<SSOCallbackPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Rutas totalmente abiertas para probar el acceso */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/rrhh" element={<RRHHPage />} />
          <Route path="/supply" element={<SupplyPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}