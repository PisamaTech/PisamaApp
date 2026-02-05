import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  AuthPage,
  CalendarDiario,
  CalendarSemanal,
  Reservas,
  Facturas,
  Perfil,
  ResetPassword,
  RecoverPassword,
  ConfirmationPage,
  Error404,
  FacturaDetalle,
  Notificaciones,
} from "./pages";
import PaymentHistory from "./pages/PaymentHistory";
import AdminDashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import ReservationsManagement from "./pages/admin/ReservationsManagement";
import BillingManagement from "./pages/admin/BillingManagement";
import PaymentManagement from "./pages/admin/PaymentManagement";
import PricingManagement from "./pages/admin/PricingManagement";
import Broadcast from "./pages/admin/Broadcast";
import PerformancePage from "./pages/admin/Performance";
import BalanceSummary from "./pages/admin/BalanceSummary";
import UserBillingDetails from "./pages/admin/UserBillingDetails";
import { useAuthStore } from "./stores/authStore";
import { useNotificationStore } from "./stores/notificationStore";
import LoadingOverlay from "./components/LoadingOverlay";
import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import ErrorToast from "./components/ErrorToast";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AdminRouteGuard from "./components/AdminRouteGuard";
import Ayuda from "./pages/Ayuda";

function App() {
  const { user, checkSession } = useAuthStore();
  const { toast, hideToast } = useUIStore();
  const initializeNotifications = useNotificationStore(
    (state) => state.initialize
  );
  const clearNotifications = useNotificationStore((state) => state.clear);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // --- Nuevo useEffect para gestionar el ciclo de vida del notificationStore ---
  useEffect(() => {
    if (!user?.id) return;

    const id = user.id;
    initializeNotifications(id);

    return () => {
      // Limpia solo si el id coincide (evita limpiar mientras la conexión aún se abre)
      clearNotifications();
    };
  }, [clearNotifications, initializeNotifications, user?.id]);

  return (
    <ErrorBoundary>
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
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/recuperar-password"
              element={<Navigate to="/dashboard" replace />}
            />

            {/* Definimos un layout general para las rutas autenticadas */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendario_semanal" element={<CalendarSemanal />} />
              <Route path="/calendario_diario" element={<CalendarDiario />} />
              <Route path="/reservas" element={<Reservas />} />
              <Route path="/facturas" element={<Facturas />} />
              <Route path="/facturas/:id" element={<FacturaDetalle />} />
              <Route path="/pagos" element={<PaymentHistory />} />
              <Route path="/notificaciones" element={<Notificaciones />} />
              <Route
                path="/admin"
                element={<Navigate to="/admin/dashboard" replace />}
              />
              <Route
                path="/admin/dashboard"
                element={<AdminRouteGuard><AdminDashboard /></AdminRouteGuard>}
              />
              <Route
                path="/admin/performance"
                element={<AdminRouteGuard><PerformancePage /></AdminRouteGuard>}
              />
              <Route
                path="/admin/user-management"
                element={<AdminRouteGuard><UserManagement /></AdminRouteGuard>}
              />
              <Route
                path="/admin/reservations-management"
                element={<AdminRouteGuard><ReservationsManagement /></AdminRouteGuard>}
              />
              <Route
                path="/admin/billing-management"
                element={<AdminRouteGuard><BillingManagement /></AdminRouteGuard>}
              />
              <Route
                path="/admin/payment-management"
                element={<AdminRouteGuard><PaymentManagement /></AdminRouteGuard>}
              />
              <Route
                path="/admin/pricing-management"
                element={<AdminRouteGuard><PricingManagement /></AdminRouteGuard>}
              />
              <Route
                path="/admin/broadcast"
                element={<AdminRouteGuard><Broadcast /></AdminRouteGuard>}
              />
              <Route
                path="/admin/balance-summary"
                element={<AdminRouteGuard><BalanceSummary /></AdminRouteGuard>}
              />
              <Route
                path="/admin/balance-summary/:userId"
                element={<AdminRouteGuard><UserBillingDetails /></AdminRouteGuard>}
              />
              <Route path="perfil" element={<Perfil />} />
              <Route path="ayuda" element={<Ayuda />} />
              <Route path="reset-password" element={<ResetPassword />} />
              {/* Si no coincide ninguna, redirigimos a calendario */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
    </ErrorBoundary>
  );
}

export default App;
