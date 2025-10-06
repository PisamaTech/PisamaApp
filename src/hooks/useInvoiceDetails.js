import { useState, useEffect, useCallback } from "react";
import { fetchInvoiceDetails } from "@/services/billingService";
import { getProfileById } from "@/supabase/profileService"; // Importar la nueva función

/**
 * Custom hook para obtener y gestionar los detalles de una factura.
 * Encapsula la lógica de carga, el estado de error y los datos de la factura.
 *
 * @param {string | number} invoiceId - El ID de la factura a cargar.
 * @param {string} userId - El ID del usuario que realiza la consulta.
 * @param {string} userRole - El rol del usuario para la validación de permisos.
 * @returns {{
 *   invoiceData: object | null,
 *   customerProfile: object | null, // Perfil del dueño de la factura
 *   loading: boolean,
 *   error: Error | null,
 *   updateLocalInvoice: (updatedFactura: object) => void
 * }}
 */
export const useInvoiceDetails = (invoiceId, userId, userRole) => {
  const [invoiceData, setInvoiceData] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null); // Estado para el perfil del cliente
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDetails = useCallback(async () => {
    if (!userId || !invoiceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setCustomerProfile(null); // Resetear en cada carga

    try {
      const data = await fetchInvoiceDetails(invoiceId, userId, userRole);
      setInvoiceData(data);

      // Si el usuario de la factura no es el usuario actual, buscar su perfil
      if (data && data.factura && data.factura.usuario_id !== userId) {
        const profile = await getProfileById(data.factura.usuario_id);
        setCustomerProfile(profile);
      }
    } catch (err) {
      setError(err);
      console.error("Error al cargar detalles de la factura:", err);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, userId, userRole]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Función para permitir que el componente actualice el estado de la factura localmente
  const updateLocalInvoice = useCallback((updatedFactura) => {
    setInvoiceData((prevData) => {
      if (!prevData) return null;
      return {
        ...prevData,
        factura: updatedFactura,
      };
    });
  }, []);

  return { invoiceData, customerProfile, loading, error, updateLocalInvoice };
};
