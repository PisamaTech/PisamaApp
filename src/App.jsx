import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage";
import { useAuthStore } from "./stores/authStore";
import Layout from "./pages/Layout";
import { Reservas } from "./pages/Reservas";
import { CalendarView } from "./pages/CalendarView";
import { Facturas } from "./pages/Facturas";
import { Admin } from "./pages/Admin";
import { Perfil } from "./pages/Perfil";

function App() {
  const { user, checkSession, loading } = useAuthStore();
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/auth" element={!user ? <AuthPage /> : <Layout />} /> */}
        <Route
          path="/*"
          element={
            user ? (
              <Layout>
                <Routes>
                  <Route path="/calendario" element={<CalendarView />} />
                  <Route path="/reservas" element={<Reservas />} />
                  <Route path="/facturas" element={<Facturas />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/perfil" element={<Perfil />} />
                </Routes>
              </Layout>
            ) : (
              <AuthPage />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
