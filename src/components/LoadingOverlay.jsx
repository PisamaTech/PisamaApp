import { useUIStore } from "../stores/uiStore";

const LoadingOverlay = () => {
  const { loading, loadingMessage } = useUIStore(); // ✅ NUEVO: Obtener también el mensaje

  if (!loading) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={loadingMessage || "Cargando..."}
    >
      <div className="flex flex-col items-center text-white max-w-md mx-4">
        {/* Spinner de carga */}
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"
          aria-hidden="true"
        ></div>

        {/* Mensaje personalizable */}
        <p className="text-center tracking-wide text-lg font-medium">
          {loadingMessage}
        </p>

        {/* Indicador adicional para operaciones largas */}
        <div className="mt-3 flex space-x-1" aria-hidden="true">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <div
            className="w-2 h-2 bg-white rounded-full animate-pulse"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <div
            className="w-2 h-2 bg-white rounded-full animate-pulse"
            style={{ animationDelay: "0.4s" }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
