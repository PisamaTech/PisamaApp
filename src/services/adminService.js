import { supabase } from "@/supabase/supabase.config"; // Asegúrate que la ruta es correcta
import dayjs from "dayjs";

/**
 * Obtiene una lista paginada de todos los usuarios, con opción de búsqueda.
 * Esta función es para el panel de administración.
 *
 * @param {number} page - La página actual para la paginación.
 * @param {number} itemsPerPage - Cuántos usuarios por página.
 * @param {string} searchTerm - El término de búsqueda para filtrar por nombre, apellido o email.
 * @returns {Promise<{data: Array<object>, count: number}>} Un objeto con los usuarios y el conteo total.
 */
export const fetchAllUsers = async (
  page = 1,
  itemsPerPage = 10,
  searchTerm = ""
) => {
  try {
    const offset = (page - 1) * itemsPerPage;

    let query = supabase.from("user_profiles").select("*", { count: "exact" });

    if (searchTerm.trim() !== "") {
      // Busca en múltiples columnas usando 'or'. ilike es case-insensitive.
      // Asegúrate de que los nombres de columna (firstName, lastName, email) coincidan con tu tabla.
      query = query.or(
        `firstName.ilike.%${searchTerm}%,lastName.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      );
    }

    // Aplica orden y paginación
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error("Error al obtener todos los usuarios:", error);
    throw new Error(`No se pudieron obtener los usuarios: ${error.message}`);
  }
};

/**
 * Actualiza la modalidad de pago de un usuario específico.
 * Esta función es para ser usada por un administrador.
 *
 * @param {string} userId - El ID del usuario a modificar.
 * @param {string} newPaymentMethod - La nueva modalidad ('semanal' o 'mensual').
 * @returns {Promise<object>} El perfil de usuario actualizado.
 */
export const updateUserPaymentMethod = async (userId, newPaymentMethod) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ modalidad_pago: newPaymentMethod })
      .eq("id", userId)
      .select()
      .single(); // Devuelve el objeto actualizado para confirmación

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error(
      `Error al actualizar la modalidad de pago para el usuario ${userId}:`,
      error
    );
    throw new Error(
      `No se pudo actualizar la modalidad de pago: ${error.message}`
    );
  }
};

/**
 * Obtiene todas las facturas del sistema desde la VISTA 'facturas_con_detalles_usuario'.
 *
 * @param {number} page
 * @param {number} itemsPerPage
 * @param {object} filters - Objeto con filtros opcionales: { userId, status }
 * @returns {Promise<{data: Array<object>, count: number}>}
 */
export const searchAllInvoices = async (
  page = 1,
  itemsPerPage = 10,
  filters = {}
) => {
  try {
    const offset = (page - 1) * itemsPerPage;

    // --- CAMBIO CLAVE: AHORA CONSULTAMOS LA VISTA ---
    let query = supabase
      .from("facturas_con_detalles_usuario") // <-- Usamos el nombre de la VISTA
      .select("*", { count: "exact" }); // <-- El select es ahora simple

    // Los filtros funcionan igual porque la vista tiene las mismas columnas
    if (filters.userId && filters.userId !== "todos") {
      query = query.eq("usuario_id", filters.userId);
    }
    if (filters.status && filters.status !== "todos") {
      query = query.eq("estado", filters.status);
    }

    query = query
      .order("fecha_emision", { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error("Error buscando todas las facturas:", error);
    throw new Error(`No se pudieron obtener las facturas: ${error.message}`);
  }
};

/**
 * Marca una factura como 'pagada' y establece la fecha de pago.
 *
 * @param {number|string} invoiceId - El ID de la factura a actualizar.
 * @returns {Promise<object>} La factura actualizada.
 */
export const markInvoiceAsPaid = async (invoiceId) => {
  try {
    const { data, error } = await supabase
      .from("facturas")
      .update({
        estado: "pagada",
        fecha_pago: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(
      `Error al marcar la factura ${invoiceId} como pagada:`,
      error
    );
    throw new Error(`No se pudo actualizar la factura: ${error.message}`);
  }
};

/**
 * Obtiene la lista de todos los consultorios con sus precios actuales.
 * @returns {Promise<Array<object>>}
 */
export const fetchAllConsultorios = async () => {
  try {
    const { data, error } = await supabase
      .from("consultorios")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error al obtener los consultorios:", error);
    throw new Error(
      `No se pudieron obtener los consultorios: ${error.message}`
    );
  }
};

/**
 * Actualiza el precio por hora de un consultorio específico.
 * @param {number|string} consultorioId - El ID del consultorio a actualizar.
 * @param {number} newPrice - El nuevo precio por hora.
 * @returns {Promise<object>} El consultorio actualizado.
 */
export const updateConsultorioPrice = async (consultorioId, newPrice) => {
  try {
    // Validar que el precio sea un número válido
    if (isNaN(newPrice) || newPrice < 0) {
      throw new Error("El precio debe ser un número positivo.");
    }

    const { data, error } = await supabase
      .from("consultorios")
      .update({ precio_hora: newPrice })
      .eq("id", consultorioId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(
      `Error al actualizar el precio del consultorio ${consultorioId}:`,
      error
    );
    throw new Error(`No se pudo actualizar el precio: ${error.message}`);
  }
};

/**
 * Busca en TODAS las reservas del sistema con filtros avanzados y paginación.
 * Usa la VISTA para obtener el nombre del consultorio y del usuario.
 *
 * @param {number} page
 * @param {number} itemsPerPage
 * @param {object} filters - Objeto con filtros: { userId, status, consultorioId, dateRange }
 * @returns {Promise<{data: Array<object>, count: number}>}
 */
export const searchAllReservations = async (
  page = 1,
  itemsPerPage = 10,
  filters = {}
) => {
  try {
    const offset = (page - 1) * itemsPerPage;

    // Supongamos que tienes una VISTA que une reservas con usuarios y consultorios.
    // Si no, tendremos que hacer el JOIN aquí. Vamos a asumir que podemos crearla.
    // El nombre de la vista podría ser 'reservas_completas'.
    // Si no tienes la vista, la consulta sería más compleja.
    // Por ahora, asumimos que la crearemos.

    let query = supabase
      .from("reservas_completas") // Consultaremos una VISTA para simplificar
      .select("*", { count: "exact" });

    // Aplicar filtros
    if (filters.userId && filters.userId !== "todos") {
      query = query.eq("usuario_id", filters.userId);
    }
    if (filters.status && filters.status !== "todos") {
      query = query.eq("estado", filters.status);
    }
    if (filters.consultorioId && filters.consultorioId !== "todos") {
      query = query.eq("consultorio_id", filters.consultorioId);
    }
    if (filters.dateRange?.from) {
      query = query.gte("start_time", filters.dateRange.from.toISOString());
    }
    if (filters.dateRange?.to) {
      const endOfDay = dayjs(filters.dateRange.to).endOf("day").toISOString();
      query = query.lte("start_time", endOfDay);
    }

    query = query
      .order("start_time", { ascending: false }) // Las más recientes primero
      .range(offset, offset + itemsPerPage - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error("Error buscando todas las reservas:", error);
    throw new Error(`No se pudieron obtener las reservas: ${error.message}`);
  }
};
