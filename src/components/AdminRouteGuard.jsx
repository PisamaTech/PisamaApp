import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * Un componente guardián que protege rutas, permitiendo el acceso solo a usuarios
 * con el rol de 'admin'. Si el usuario no está logueado o no es admin,
 * lo redirige a la página del dashboard.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - El componente o ruta a renderizar si el usuario es admin.
 */
const AdminRouteGuard = ({ children }) => {
  // Obtiene el perfil del usuario desde el store de Zustand
  const { profile } = useAuthStore.getState();

  // 1. Comprobación de si el perfil está cargado y si el rol es 'admin'
  const isAdmin = profile && profile.role === "admin";

  // 2. Lógica de renderizado condicional
  if (!isAdmin) {
    // Si no es admin (o el perfil aún no se carga, por lo que profile es null),
    // redirigir al dashboard. `replace` evita que esta ruta de redirección
    // se guarde en el historial del navegador.
    console.warn("Acceso denegado a ruta de admin. Redirigiendo a /dashboard.");
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Si es admin, renderiza los componentes hijos que se le pasaron.
  // En nuestro caso, será el componente <Admin />.
  return children;
};

export default AdminRouteGuard;
