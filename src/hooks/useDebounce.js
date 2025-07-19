import { useState, useEffect } from "react";

/**
 * Un hook que retrasa la actualización de un valor.
 * Útil para evitar peticiones de API en cada pulsación de tecla en un input de búsqueda.
 *
 * @param {*} value - El valor a "deboucear" (ej. el término de búsqueda).
 * @param {number} delay - El tiempo de retraso en milisegundos.
 * @returns {*} El valor "debounced".
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Configura un temporizador que actualizará el valor "debounced"
    // después del tiempo de 'delay'.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpia el temporizador si el 'value' o 'delay' cambian antes de que se cumpla.
    // Esto es lo que previene la ejecución en cada pulsación de tecla.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Solo se re-ejecuta el efecto si 'value' o 'delay' cambian

  return debouncedValue;
}

export default useDebounce;
