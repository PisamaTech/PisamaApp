import { useUIStore } from "../stores/uiStore";

export const useAsyncHandler = () => {
  const { startLoading, stopLoading, setError } = useUIStore();

  const handleAsync = async (asyncFunction) => {
    try {
      startLoading();
      const result = await asyncFunction();
      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      stopLoading();
    }
  };

  return handleAsync;
};
