import { supabase } from "@/supabase/supabase.config"; // Asegúrate que la ruta es correcta

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
