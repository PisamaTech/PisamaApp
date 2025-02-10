import { useState } from "react";
import {
  Calendar,
  BookOpen,
  FileText,
  User as UserIcon,
  Shield,
  ArrowLeftRight,
  Sun,
  Moon,
} from "lucide-react";
import logoPisama from "../assets/EspacioPimasaLogo-100.webp";

const AppBar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState("light");

  const user = {
    name: "Juan Perez",
    email: "juan@example.com",
    role: "admin",
  };

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleLogout = () => {
    console.log("Logout");
    alert("Sesión cerrada");
  };

  const navItems = [
    { label: "Calendario", icon: <Calendar className="h-5 w-5" /> },
    { label: "Mis Reservas", icon: <BookOpen className="h-5 w-5" /> },
    { label: "Mis Facturas", icon: <FileText className="h-5 w-5" /> },
    { label: "Perfil", icon: <UserIcon className="h-5 w-5" /> },
  ];

  if (user.role === "admin") {
    navItems.push({
      label: "Administrador",
      icon: <Shield className="h-5 w-5" />,
    });
  }

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <div
          className={`flex flex-col justify-between p-4 border-r transition-all duration-300 ${
            isCollapsed ? "w-20" : "w-64"
          } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10 flex-shrink-0" /> */}
                <img src={logoPisama} alt="Logo" className="w-10 h-10" />
                {!isCollapsed && (
                  <span className="text-xl">Espacio Pisama</span>
                )}
              </div>
              <button
                onClick={toggleSidebar}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <ArrowLeftRight className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8">
              <ul className="space-y-2">
                {navItems.map((item, index) => (
                  <li key={index}>
                    <button className="flex items-center gap-4 w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      {item.icon}
                      {!isCollapsed && <span>{item.label}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div>
            <div className="mb-4">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                {!isCollapsed && (
                  <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Contenido Principal
          </h1>
        </div>
      </div>
    </div>
  );
};

export default AppBar;
