import { supabase } from "@/supabase";

/**
 * Actualiza los datos del perfil de un usuario en la tabla 'user_profiles'.
 * @param {string} userId - El ID del usuario a actualizar.
 * @param {object} profileData - Objeto con los datos a actualizar ({ first_name, last_name, phone }).
 * @returns {Promise<object>} El perfil actualizado.
 */
export const updateUserProfile = async (userId, profileData) => {
  const { data, error } = await supabase
    .from("user_profiles")
    .update(profileData)
    .eq("id", userId)
    .select()
    .single(); // Devuelve el objeto actualizado

  if (error) {
    console.error("Error actualizando el perfil:", error);
    throw error;
  }
  return data;
};

/**
 * Actualiza la contraseña del usuario actualmente autenticado.
 * @param {string} newPassword - La nueva contraseña.
 * @returns {Promise<object>} El usuario actualizado.
 */
export const updateUserPassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error("Error actualizando la contraseña:", error);
    throw error;
  }
  return data.user;
};

/**
 * Obtiene el perfil de un usuario por su ID.
 * @param {string} userId - El ID del usuario a buscar.
 * @returns {Promise<object|null>} El perfil del usuario o null si no se encuentra o hay un error.
 */
export const getProfileById = async (userId) => {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("firstName, lastName")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(`Error buscando el perfil para el ID ${userId}:`, error);
    return null; // No lanzar error, solo devolver null
  }
  return data;
};