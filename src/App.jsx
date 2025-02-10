import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage";
import { useAuthStore } from "./stores/authStore";
import Layout from "./components/Layout";
import { Reservas } from "./pages/Reservas";
import { CalendarView } from "./pages/CalendarView";
import { Facturas } from "./pages/Facturas";
import { Admin } from "./pages/Admin";
import { Perfil } from "./pages/Perfil";
import LoadingOverlay from "./components/LoadingOverlay";
import ErrorToast from "./components/ErrorToast";
import { useEffect } from "react";

function App() {
  const { user, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/*"
          element={
            user ? (
              <>
                <LoadingOverlay />
                <ErrorToast />
                <Layout>
                  <Routes>
                    <Route path="/calendario" element={<CalendarView />} />
                    <Route path="/reservas" element={<Reservas />} />
                    <Route path="/facturas" element={<Facturas />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/perfil" element={<Perfil />} />
                  </Routes>
                </Layout>
              </>
            ) : (
              <>
                <LoadingOverlay />
                <ErrorToast />
                <AuthPage />
              </>
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
