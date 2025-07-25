import { supabase } from "@/supabase/supabase.config";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);
/**
 * Obtiene el historial de facturas generadas para un usuario, con paginación.
 *
 * @param {string} userId - El ID del usuario.
 * @param {number} currentPage - La página actual para la paginación.
 * @param {number} itemsPerPage - Cuántos items por página.
 * @returns {Promise<{data: Array<object>, count: number}>} Un objeto con las facturas y el conteo total.
 */
export const fetchUserInvoices = async (
  userId,
  currentPage = 1,
  itemsPerPage = 10
) => {
  const offset = (currentPage - 1) * itemsPerPage;

  try {
    const { data, error, count } = await supabase
      .from("facturas")
      .select("*", { count: "exact" }) // Pide el conteo total para la paginación
      .eq("usuario_id", userId)
      .order("fecha_emision", { ascending: false }) // Las más recientes primero
      .range(offset, offset + itemsPerPage - 1); // Aplica la paginación

    if (error) throw error;

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error("Error al obtener el historial de facturas:", error);
    throw new Error(
      `No se pudo obtener el historial de facturas: ${error.message}`
    );
  }
};

/**
 * Obtiene los detalles completos de una factura específica, incluyendo las reservas asociadas.
 *
 * @param {number|string} invoiceId - El ID de la factura a consultar.
 * @param {string} userId - El ID del usuario que realiza la consulta.
 * @param {string} [userRole] - El rol del usuario. Si es 'admin', se omite la validación de `userId`.
 * @returns {Promise<{factura: object, detalles: Array<object>}>} Un objeto con los datos de la factura y un array con sus detalles.
 */
export const fetchInvoiceDetails = async (invoiceId, userId, userRole) => {
  try {
    // 1. Obtener los datos de la factura principal y validar propiedad
    let query = supabase.from("facturas").select("*").eq("id", invoiceId);
    // Si el usuario no es 'admin', se asegura que solo pueda ver sus propias facturas.
    if (userRole !== "admin") {
      query = query.eq("usuario_id", userId);
    }

    const { data: factura, error: facturaError } = await query.single();
    if (facturaError) throw facturaError;
    if (!factura)
      throw new Error("Factura no encontrada o no tienes permiso para verla.");
    // 2. Obtener los detalles de la factura, haciendo JOIN con la información de la reserva
    const { data: detalles, error: detallesError } = await supabase
      .from("detalles_factura")
      .select(
        `
        *,
        reservas (
          start_time,
          end_time,
          tipo_reserva,
          usaCamilla,
          consultorio_id,
          consultorios (
            nombre
          )
        )
      `
      )
      .eq("factura_id", invoiceId);

    if (detallesError) throw detallesError;

    // 3. Ordenar en el cliente por start_time de las reservas
    const detallesOrdenados = (detalles || []).sort((a, b) => {
      const timeA = a.reservas?.start_time
        ? new Date(a.reservas.start_time)
        : new Date(0);
      const timeB = b.reservas?.start_time
        ? new Date(b.reservas.start_time)
        : new Date(0);
      return timeA - timeB;
    });
    return { factura, detalles: detallesOrdenados || [] };
  } catch (error) {
    console.error(
      `Error al obtener los detalles de la factura ${invoiceId}:`,
      error
    );
    throw new Error(
      `No se pudieron obtener los detalles de la factura: ${error.message}`
    );
  }
};

/**
 * Llama a una RPC para obtener la vista previa del período actual.
 *
 * @param {string} userId - El ID del usuario.
 * @param {object} userProfile - El perfil del usuario, que contiene 'modalidad_pago'.
 * @returns {Promise<object>} Un objeto con la lista de reservas calculadas y los totales.
 */
export const fetchCurrentPeriodPreview = async (userId, userProfile) => {
  if (!userProfile || !userProfile.modalidad_pago) {
    return {
      calculatedBookings: [],
      totals: { base: 0, discount: 0, final: 0 },
    };
  }

  // Determinar el rango del período actual
  const today = dayjs();
  let periodStart, periodEnd;

  if (userProfile.modalidad_pago === "semanal") {
    periodStart = today.startOf("isoWeek").format("YYYY-MM-DD"); // Formato para la RPC
    periodEnd = today.endOf("isoWeek").format("YYYY-MM-DD");
  } else {
    // mensual
    periodStart = today.startOf("month").format("YYYY-MM-DD");
    periodEnd = today.endOf("month").format("YYYY-MM-DD");
  }

  try {
    const { data, error } = await supabase.rpc("get_billing_preview_for_user", {
      p_user_id: userId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    });

    if (error) throw error;

    // La RPC ya devuelve el objeto con el formato que necesita la UI
    return data;
  } catch (error) {
    console.error(
      "Error al obtener la vista previa del período actual vía RPC:",
      error
    );
    throw new Error(`No se pudo obtener la vista previa: ${error.message}`);
  }
};
