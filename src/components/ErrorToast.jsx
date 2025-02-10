import { useUIStore } from "../stores/uiStore";
import { useEffect } from "react";

const ErrorToast = () => {
  const { error, clearError } = useUIStore();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!error) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between">
        <span>{error}</span>
        <button onClick={clearError} className="ml-4 hover:text-red-200">
          ×
        </button>
      </div>
    </div>
  );
};

export default ErrorToast;
