import { supabase } from "@/supabase/supabase.config";

/**
 * Obtiene el historial de pagos de un usuario con paginación.
 *
 * @param {string} userId - El ID del usuario.
 * @param {number} currentPage - La página actual para la paginación.
 * @param {number} itemsPerPage - Cuántos items por página.
 * @returns {Promise<{data: Array<object>, count: number}>} Un objeto con los pagos y el conteo total.
 */
export const fetchUserPayments = async (
  userId,
  currentPage = 1,
  itemsPerPage = 10
) => {
  const offset = (currentPage - 1) * itemsPerPage;

  try {
    const { data, error, count } = await supabase
      .from("pagos")
      .select("*", { count: "exact" })
      .eq("usuario_id", userId)
      .order("fecha_pago", { ascending: false }) // Los más recientes primero
      .range(offset, offset + itemsPerPage - 1);

    if (error) throw error;

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error("Error al obtener el historial de pagos:", error);
    throw new Error(
      `No se pudo obtener el historial de pagos: ${error.message}`
    );
  }
};

/**
 * Obtiene el balance actual de un usuario (pagos vs facturas).
 * Utiliza la función RPC get_user_balance de la base de datos.
 *
 * @param {string} userId - El ID del usuario.
 * @returns {Promise<{saldo_disponible: number, total_pagos: number, total_facturado: number, saldo_facturas_pendientes: number}>}
 */
export const fetchUserBalance = async (userId) => {
  try {
    const { data, error } = await supabase.rpc("get_user_balance", {
      p_user_id: userId,
    });

    if (error) throw error;

    // La función RPC devuelve un array con un solo objeto
    const balance = data?.[0] || {
      saldo_disponible: 0,
      total_pagos: 0,
      total_facturado: 0,
      saldo_facturas_pendientes: 0,
    };

    return balance;
  } catch (error) {
    console.error("Error al obtener el balance del usuario:", error);
    throw new Error(`No se pudo obtener el balance: ${error.message}`);
  }
};

/**
 * Admin: Crea un pago manual (efectivo, descuento especial, ajuste de saldo).
 *
 * @param {object} paymentData - Datos del pago.
 * @param {string} paymentData.userId - ID del usuario.
 * @param {number} paymentData.amount - Monto del pago.
 * @param {string} paymentData.type - Tipo: 'transferencia', 'efectivo', 'descuento_especial', 'ajuste_saldo'.
 * @param {string} [paymentData.date] - Fecha del pago (opcional, default: now).
 * @param {string} [paymentData.note] - Nota adicional (opcional).
 * @returns {Promise<object>} El pago creado.
 */
export const createManualPayment = async (paymentData) => {
  try {
    const { data, error } = await supabase
      .from("pagos")
      .insert({
        usuario_id: paymentData.userId,
        monto: paymentData.amount,
        tipo: paymentData.type,
        fecha_pago: paymentData.date || new Date().toISOString(),
        estado: "procesado",
        nota: paymentData.note || null,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error al crear pago manual:", error);
    throw new Error(`No se pudo crear el pago manual: ${error.message}`);
  }
};

/**
 * Admin: Busca todos los pagos con filtros y paginación.
 * Utiliza la vista pagos_con_detalles_usuario que incluye información del usuario.
 *
 * @param {number} currentPage - La página actual para la paginación.
 * @param {number} itemsPerPage - Cuántos items por página.
 * @param {object} filters - Filtros opcionales.
 * @param {string} [filters.userId] - Filtrar por ID de usuario.
 * @param {string} [filters.tipo] - Filtrar por tipo de pago.
 * @param {object} [filters.dateRange] - Rango de fechas { from: Date, to: Date }.
 * @returns {Promise<{data: Array<object>, count: number}>} Un objeto con los pagos y el conteo total.
 */
export const searchAllPayments = async (
  currentPage = 1,
  itemsPerPage = 10,
  filters = {}
) => {
  const offset = (currentPage - 1) * itemsPerPage;

  try {
    let query = supabase
      .from("pagos_con_detalles_usuario")
      .select("*", { count: "exact" });

    // Aplicar filtros
    if (filters.userId && filters.userId !== "todos") {
      query = query.eq("usuario_id", filters.userId);
    }

    if (filters.tipo && filters.tipo !== "todos") {
      query = query.eq("tipo", filters.tipo);
    }

    if (filters.dateRange?.from) {
      query = query.gte("fecha_pago", filters.dateRange.from.toISOString());
    }

    if (filters.dateRange?.to) {
      query = query.lte("fecha_pago", filters.dateRange.to.toISOString());
    }

    // Ordenar y paginar
    query = query
      .order("fecha_pago", { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error("Error al buscar pagos:", error);
    throw new Error(`No se pudo buscar los pagos: ${error.message}`);
  }
};

/**
 * Admin: Crea una factura manual histórica.
 * Útil para registrar deudas previas a la implementación de la app.
 *
 * @param {object} invoiceData - Datos de la factura.
 * @param {string} invoiceData.userId - ID del usuario.
 * @param {string} invoiceData.periodoInicio - Fecha de inicio del período.
 * @param {string} invoiceData.periodoFin - Fecha de fin del período.
 * @param {number} invoiceData.montoTotal - Monto total de la factura.
 * @param {string} invoiceData.estado - Estado: 'pendiente' o 'pagada'.
 * @param {string} [invoiceData.note] - Nota adicional (opcional).
 * @returns {Promise<object>} La factura creada.
 */
export const createManualInvoice = async (invoiceData) => {
  try {
    const { data, error } = await supabase
      .from("facturas")
      .insert({
        usuario_id: invoiceData.userId,
        periodo_inicio: invoiceData.periodoInicio,
        periodo_fin: invoiceData.periodoFin,
        monto_total: invoiceData.montoTotal,
        monto_base: invoiceData.montoTotal, // Para facturas manuales, base = total
        monto_descuento: 0,
        saldo_pendiente:
          invoiceData.estado === "pendiente" ? invoiceData.montoTotal : 0,
        estado: invoiceData.estado,
        fecha_emision: new Date().toISOString(),
        fecha_pago: invoiceData.estado === "pagada" ? new Date().toISOString() : null,
        nota: invoiceData.note || null,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error al crear factura manual:", error);
    throw new Error(`No se pudo crear la factura manual: ${error.message}`);
  }
};

/**
 * Obtiene estadísticas de pagos para el dashboard admin.
 *
 * @param {string} userId - ID del usuario (opcional para ver stats de un usuario específico).
 * @param {Date} [startDate] - Fecha de inicio (opcional).
 * @param {Date} [endDate] - Fecha de fin (opcional).
 * @returns {Promise<{total_payments: number, total_amount: number, by_type: Array}>}
 */
export const getPaymentStats = async (userId = null, startDate = null, endDate = null) => {
  try {
    let query = supabase
      .from("pagos")
      .select("tipo, monto, estado");

    if (userId) {
      query = query.eq("usuario_id", userId);
    }

    if (startDate) {
      query = query.gte("fecha_pago", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("fecha_pago", endDate.toISOString());
    }

    query = query.eq("estado", "procesado"); // Solo pagos procesados

    const { data, error } = await query;

    if (error) throw error;

    // Calcular estadísticas
    const total_payments = data.length;
    const total_amount = data.reduce((sum, p) => sum + Number(p.monto), 0);

    // Agrupar por tipo
    const by_type = data.reduce((acc, p) => {
      const existing = acc.find((item) => item.tipo === p.tipo);
      if (existing) {
        existing.count += 1;
        existing.total += Number(p.monto);
      } else {
        acc.push({
          tipo: p.tipo,
          count: 1,
          total: Number(p.monto),
        });
      }
      return acc;
    }, []);

    return {
      total_payments,
      total_amount,
      by_type,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de pagos:", error);
    throw new Error(
      `No se pudieron obtener las estadísticas: ${error.message}`
    );
  }
};
