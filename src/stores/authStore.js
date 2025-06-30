import { create } from "zustand";
import { persist } from "zustand/middleware"; // Importa el middleware persist
import { supabase } from "../supabase/supabase.config.js";
import { useUIStore } from "./uiStore";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // Estado del usuario autenticado
      loading: false, // Estado de carga
      error: null, // Estado de error
      profile: null, // Estado de perfil

      // Verificar la sesión al cargar la aplicación
      checkSession: async () => {
        const { startLoading, setError, clearError, showToast, stopLoading } =
          useUIStore.getState();

        startLoading();
        clearError();

        try {
          // Obtener la sesión actual
          const { data: session, error: sessionError } =
            await supabase.auth.getSession();

          if (sessionError) {
            setError(sessionError);
            showToast({
              type: "error",
              title: "Error",
              message: sessionError.message,
            });
            throw sessionError;
          }

          if (session.session) {
            // Si hay una sesión activa, obtener el usuario y su perfil
            const { data: userData, error: userError } =
              await supabase.auth.getUser();

            if (userError) {
              setError(userError);
              showToast({
                type: "error",
                title: "Error",
                message: userError.message,
              });
              throw userError;
            }

            // Obtener el perfil del usuario desde la tabla `user_profiles`
            const { data: profileData, error: profileError } = await supabase
              .from("user_profiles")
              .select("*")
              .eq("id", userData.user?.id)
              .single();

            if (profileError) {
              setError(profileError);
              showToast({
                type: "error",
                title: "Error",
                message: profileError.message,
              });
              throw profileError;
            }

            // Actualizar el estado con los datos del usuario y su perfil
            set({ user: userData.user, profile: profileData });
            stopLoading();
          } else {
            // No hay sesión activa
            set({ user: null, profile: null });
            stopLoading();
          }
        } catch (error) {
          setError(error);
          showToast({
            type: "error",
            title: "Error",
            message: error.message,
          });
        }
      },

      // Registrar nuevo usuario

      signUp: async (email, password, firstName, lastName, phone) => {
        const { startLoading, setError, clearError, showToast, stopLoading } =
          useUIStore.getState();

        startLoading();
        clearError();

        try {
          const { data: authData, error: authError } =
            await supabase.auth.signUp({
              email,
              password,
            });

          if (authError) {
            setError(authError);
            showToast({
              type: "error",
              title: "Error",
              message: authError.message,
            });
            throw authError;
          }

          // Guardar datos adicionales en la tabla `user_profiles`
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .insert([
              {
                id: authData.user?.id, // Guarda el ID del usuario
                firstName: firstName, // Guarda el nombre
                lastName: lastName, // Guarda el apellido
                phone,
                email,
              },
            ]);

          if (profileError) {
            setError(profileError);
            showToast({
              type: "error",
              title: "Error",
              message: profileError.message,
            });
            throw profileError;
          }

          // set({
          //   user: authData.user,
          //   profile: { firstName, lastName, email },
          // });
          stopLoading();
          showToast({
            type: "success",
            title: "Operación exitosa",
            message:
              "Hemos enviado un email a tu correo para verificar tu cuenta. Haz clic en el enlace para activar tu cuenta.",
          });
        } catch (error) {
          setError(error);
          showToast({
            type: "error",
            title: "Error",
            message: error.message,
          });
        }
      },

      // Iniciar sesión
      signIn: async (email, password) => {
        const { startLoading, setError, clearError, showToast, stopLoading } =
          useUIStore.getState();

        startLoading();
        clearError();

        try {
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (authError) {
            setError(authError);
            showToast({
              type: "error",
              title: "Error",
              message: authError.message,
            });
            throw authError;
          }

          // Obtener el perfil del usuario desde la tabla `user_profiles`
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", authData.user?.id)
            .single();

          if (profileError) {
            setError(profileError);
            showToast({
              type: "error",
              title: "Error",
              message: profileError.message,
            });
            throw profileError;
          }

          // Actualizar el estado con los datos del usuario y su perfil
          set({ user: authData.user, profile: profileData });
          stopLoading();
        } catch (error) {
          setError(error);
          showToast({
            type: "error",
            title: "Error",
            message: error.message,
          });
        }
      },

      // Cerrar sesión
      signOut: async () => {
        const { startLoading, setError, clearError, showToast, stopLoading } =
          useUIStore.getState();

        startLoading();
        clearError();

        try {
          const { error } = await supabase.auth.signOut();

          if (error) {
            setError(error);
            showToast({
              type: "error",
              title: "Error",
              message: error.message,
            });
            throw error;
          }

          // Limpiar el estado del usuario y su perfil
          set({ user: null, profile: null });
          stopLoading();
        } catch (error) {
          setError(error);
          showToast({
            type: "error",
            title: "Error",
            message: error.message,
          });
        }
      },

      // Actualizar información del Perfil
      updateProfileData: (updatedData) =>
        set((state) => ({
          profile: { ...state.profile, ...updatedData },
        })),
    }),
    {
      name: "auth-storage", // Nombre de la clave en localStorage
      getStorage: () => localStorage, // Usar localStorage como almacenamiento
    }
  )
);
