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
