import { useUIStore } from "../stores/uiStore";

const LoadingOverlay = () => {
  const { loading } = useUIStore();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
      <div className="flex flex-col items-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <p className="mt-4 tracking-wide">Cargando...</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
