import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().email({
    message: "Por favor, introduce un email válido.",
  }),
  password: z.string().min(6, {
    message: "La contraseña debe tener al menos 6 caracteres.",
  }),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(2, {
      message: "El nombre debe tener al menos 2 caracteres.",
    }),
    lastName: z.string().min(2, {
      message: "El apellido debe tener al menos 2 caracteres.",
    }),
    phone: z
      .string()
      .min(7, {
        message: "Por favor, introduce un teléfono válido.",
      })
      .max(15, {
        message: "El teléfono no puede tener más de 15 caracteres.",
      })
      .refine((phone) => !isNaN(phone), {
        message: "Debes ingresar sólo números",
      }),
    email: z.string().email({
      message: "Por favor, introduce un email válido.",
    }),
    password: z.string().min(6, {
      message: "La contraseña debe tener al menos 6 caracteres.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"], // path of error
  });
