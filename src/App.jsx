import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage";
import { useAuthStore } from "./stores/authStore";
import Layout from "./components/Layout";
import { Reservas } from "./pages/Reservas";
import { CalendarDiario } from "./pages/CalendarDiario";
import { Facturas } from "./pages/Facturas";
import { Admin } from "./pages/Admin";
import { Perfil } from "./pages/Perfil";
import LoadingOverlay from "./components/LoadingOverlay";
import ErrorToast from "./components/ErrorToast";
import { useEffect } from "react";
import { ResetPassword } from "./pages/ResetPassword";
import { RecoverPassword } from "./pages/RecoverPassword";
import { useUIStore } from "@/stores/uiStore";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { Error404 } from "./pages/Error404";
import { CalendarSemanal } from "./pages/CalendarSemanal";

function App() {
  const { user, checkSession } = useAuthStore();
  const { toast, hideToast } = useUIStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <BrowserRouter>
      {/* Componentes globales que se muestran en toda la aplicación */}
      <LoadingOverlay />
      <ErrorToast
        type={toast?.type}
        title={toast?.title}
        message={toast?.message}
        isOpen={toast?.isOpen}
        onClose={hideToast}
      />
      <Routes>
        {user ? (
          // Rutas para usuario autenticado
          <>
            {/* Si intenta acceder a /auth o /recuperar-password, lo redirigimos */}
            <Route
              path="/auth"
              element={<Navigate to="/calendario" replace />}
            />
            <Route
              path="/recuperar-password"
              element={<Navigate to="/calendario" replace />}
            />

            {/* Definimos un layout general para las rutas autenticadas */}
            <Route path="/" element={<Layout />}>
              <Route path="/calendario_diario" element={<CalendarDiario />} />
              <Route path="/calendario_semanal" element={<CalendarSemanal />} />
              <Route path="/reservas" element={<Reservas />} />
              <Route path="/facturas" element={<Facturas />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="perfil" element={<Perfil />} />
              <Route path="reset-password" element={<ResetPassword />} />
              {/* Si no coincide ninguna, redirigimos a calendario */}
              <Route path="*" element={<Navigate to="/calendario" replace />} />
            </Route>
          </>
        ) : (
          // Rutas para usuario NO autenticado
          <>
            <Route path="/" element={<AuthPage />} />
            <Route path="/recuperar-password" element={<RecoverPassword />} />
            <Route path="/confirmacion" element={<ConfirmationPage />} />
            {/* Si el usuario no está autenticado y accede a otra ruta, lo redirigimos a /auth */}
            <Route path="*" element={<Error404 />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
