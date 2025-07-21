import dayjs from "dayjs";
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
        message:
          "Debes ingresar sólo números, sin puntos, ni espacios en blanco.",
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

export const reservationSchema = z
  .object({
    date: z
      .string()
      .refine((val) => dayjs(val).isValid(), {
        message: "Fecha inválida",
      })
      .refine(
        (date) => {
          const hoy = dayjs().startOf("day"); // Obtiene el día de hoy a las 00:00:00
          const fechaReservaDayjs = dayjs(date).startOf("day"); // Convierte la fecha ingresada a Dayjs y setea la hora a 00:00:00
          return !fechaReservaDayjs.isBefore(hoy); // Comprueba si la fecha de reserva NO es anterior a hoy
        },
        {
          message: "La fecha de reserva debe ser a partir de hoy.",
        }
      ),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "Hora de inicio inválida",
    }),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "Hora de fin inválida",
    }),
    resourceId: z.union([
      z.number().min(1, { message: "Selecciona un consultorio" }),
      z.literal(null).refine(() => false, {
        message: "Selecciona un consultorio",
      }),
    ]),
    tipo: z.enum(["Eventual", "Fija"], {
      message: "Selecciona un tipo de reserva válido",
    }),
    usaCamilla: z.enum(["Sí", "No"], {
      message: "Selecciona si utilizarás camilla",
    }),
  })
  .refine(
    (data) => {
      const start = dayjs(`${data.date}T${data.startTime}`);
      const end = dayjs(`${data.date}T${data.endTime}`);
      return end.diff(start, "minute") >= 60; // Al menos una hora
    },
    {
      message: "La reserva debe ser de al menos una hora",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      const start = dayjs(`${data.date}T${data.startTime}`);
      const end = dayjs(`${data.date}T${data.endTime}`);
      return end.isAfter(start);
    },
    {
      message: "La hora de fin debe ser posterior a la hora de inicio",
      path: ["endTime"],
    }
  );

export const profileSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
  phone: z
    .string()
    .min(7, "Por favor, introduce un teléfono válido.")
    .max(15, "El teléfono no puede tener más de 15 números.")
    .refine((phone) => !isNaN(phone), {
      message:
        "Debes ingresar sólo números, sin puntos, ni espacios en blanco.",
    }),
});

export const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"], // Muestra el error en el campo de confirmación
  });
