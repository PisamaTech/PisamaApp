/**
 * Utilidades y helpers para el manejo de pagos
 */

/**
 * Constantes para tipos de pago disponibles
 */
export const PAYMENT_TYPES = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
  { value: "descuento_especial", label: "Descuento Especial" },
  { value: "ajuste_saldo", label: "Ajuste de Saldo" },
];

/**
 * Formatea el tipo de pago para mostrar en UI
 * @param {string} tipo - El tipo de pago ('transferencia', 'efectivo', etc.)
 * @returns {string} El nombre formateado del tipo de pago
 */
export const formatPaymentType = (tipo) => {
  const types = {
    transferencia: "Transferencia",
    efectivo: "Efectivo",
    descuento_especial: "Descuento Especial",
    ajuste_saldo: "Ajuste de Saldo",
  };
  return types[tipo] || tipo;
};

/**
 * Obtiene el variant del Badge según el tipo de pago
 * @param {string} tipo - El tipo de pago
 * @returns {string} El variant del badge ('default', 'secondary', 'success', 'warning')
 */
export const getPaymentTypeBadgeVariant = (tipo) => {
  const variants = {
    transferencia: "default", // azul
    efectivo: "secondary", // gris
    descuento_especial: "success", // verde
    ajuste_saldo: "warning", // amarillo
  };
  return variants[tipo] || "default";
};

/**
 * Formatea un monto en formato moneda uruguaya
 * @param {number} amount - El monto a formatear
 * @returns {string} El monto formateado (ej: "$1.500")
 */
export const formatCurrency = (amount) => {
  return `$${Number(amount).toLocaleString("es-UY")}`;
};

/**
 * Calcula el porcentaje de un monto respecto a otro
 * @param {number} partial - Monto parcial
 * @param {number} total - Monto total
 * @returns {number} El porcentaje (0-100)
 */
export const calculatePercentage = (partial, total) => {
  if (!total || total === 0) return 0;
  return Math.round((partial / total) * 100);
};

/**
 * Obtiene el color de estado para saldo
 * @param {number} balance - El balance del usuario
 * @returns {string} Clase de color ('green' para positivo, 'orange' para negativo)
 */
export const getBalanceColorClass = (balance) => {
  return balance >= 0 ? "green" : "orange";
};
