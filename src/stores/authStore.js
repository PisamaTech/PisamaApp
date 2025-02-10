import { create } from "zustand";
import { persist } from "zustand/middleware"; // Importa el middleware persist
import { supabase } from "../supabase/supabase.config.js";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, // Estado del usuario autenticado
      loading: false, // Estado de carga
      error: null, // Estado de error
      profile: null, // Estado de perfil

      // Verificar la sesión al cargar la aplicación
      checkSession: async () => {
        set({ loading: true });

        try {
          // Obtener la sesión actual
          const { data: session, error: sessionError } =
            await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          if (session.session) {
            // Si hay una sesión activa, obtener el usuario y su perfil
            const { data: userData, error: userError } =
              await supabase.auth.getUser();

            if (userError) {
              throw userError;
            }

            // Obtener el perfil del usuario desde la tabla `user_profiles`
            const { data: profileData, error: profileError } = await supabase
              .from("user_profiles")
              .select("*")
              .eq("id", userData.user?.id)
              .single();

            if (profileError) {
              throw profileError;
            }

            // Actualizar el estado con los datos del usuario y su perfil
            set({ user: userData.user, profile: profileData, loading: false });
          } else {
            // No hay sesión activa
            set({ user: null, profile: null, loading: false });
          }
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      checkAuth: async () => {
        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) throw error;

          if (session?.user) {
            set({ user: session.user });
          } else {
            set({ user: null });
          }
        } catch (error) {
          console.error("Error verifying session:", error);
          set({ user: null });
        } finally {
          set({ loading: false });
        }
      },

      // Registrar nuevo usuario

      signUp: async (email, password, firstName, lastName, phone) => {
        set({ loading: true, error: null });

        try {
          const { data: authData, error: authError } =
            await supabase.auth.signUp({
              email,
              password,
            });

          if (authError) {
            throw authError;
          }

          // Guardar datos adicionales en la tabla `user_profiles`
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .insert([
              {
                id: authData.user?.id,
                firstName: firstName, // Guarda el nombre por separado
                lastName: lastName, // Guarda el apellido por separado
                phone,
              },
            ]);

          if (profileError) {
            throw profileError;
          }

          set({
            user: authData.user,
            profile: { firstName, lastName, email },
            loading: false,
          });
          window.location.href = "/";
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      // Iniciar sesión
      signIn: async (email, password) => {
        set({ loading: true, error: null });

        try {
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (authError) {
            throw authError;
          }

          // Obtener el perfil del usuario desde la tabla `user_profiles`
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", authData.user?.id)
            .single();

          if (profileError) {
            throw profileError;
          }

          // Actualizar el estado con los datos del usuario y su perfil
          set({ user: authData.user, profile: profileData, loading: false });

          return true; // Autenticación exitosa
        } catch (error) {
          set({ error: error.message, loading: false });
          return false; // Error en la autenticación
        }
      },

      // Cerrar sesión
      signOut: async () => {
        set({ loading: true, error: null });

        try {
          const { error } = await supabase.auth.signOut();

          if (error) {
            throw error;
          }

          // Limpiar el estado del usuario y su perfil
          set({ user: null, profile: null, loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },
    }),
    {
      name: "auth-storage", // Nombre de la clave en localStorage
      getStorage: () => localStorage, // Usar localStorage como almacenamiento
    }
  )
);
