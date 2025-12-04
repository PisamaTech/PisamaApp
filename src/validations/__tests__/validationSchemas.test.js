import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import {
  loginSchema,
  registerSchema,
  reservationSchema,
  profileSchema,
  passwordSchema,
} from "../validationSchemas";

describe("loginSchema", () => {
  it("should validate correct login data", () => {
    const validData = {
      email: "test@example.com",
      password: "password123",
    };
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const invalidData = {
      email: "invalid-email",
      password: "password123",
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("email válido");
  });

  it("should reject short password", () => {
    const invalidData = {
      email: "test@example.com",
      password: "12345",
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("6 caracteres");
  });
});

describe("registerSchema", () => {
  it("should validate correct registration data", () => {
    const validData = {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "091234567",
      email: "juan@example.com",
      profession: "psicologo",
      password: "password123",
      confirmPassword: "password123",
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should transform phone number removing non-digits", () => {
    const data = {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "09-123-4567",
      email: "juan@example.com",
      profession: "psicologo",
      password: "password123",
      confirmPassword: "password123",
    };
    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data?.phone).toBe("091234567");
  });

  it("should reject phone not starting with 09", () => {
    const invalidData = {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "081234567",
      email: "juan@example.com",
      profession: "psicologo",
      password: "password123",
      confirmPassword: "password123",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("comenzar con 09");
  });

  it("should reject phone with wrong length", () => {
    const invalidData = {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "0912345",
      email: "juan@example.com",
      profession: "psicologo",
      password: "password123",
      confirmPassword: "password123",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("9 dígitos");
  });

  it("should reject mismatched passwords", () => {
    const invalidData = {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "091234567",
      email: "juan@example.com",
      profession: "psicologo",
      password: "password123",
      confirmPassword: "different123",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("no coinciden");
  });

  it("should require otherProfession when profession is 'otro'", () => {
    const invalidData = {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "091234567",
      email: "juan@example.com",
      profession: "otro",
      otherProfession: "",
      password: "password123",
      confirmPassword: "password123",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("especifique su profesión");
  });

  it("should accept otherProfession when profession is 'otro'", () => {
    const validData = {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "091234567",
      email: "juan@example.com",
      profession: "otro",
      otherProfession: "Terapeuta Ocupacional",
      password: "password123",
      confirmPassword: "password123",
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject short first name", () => {
    const invalidData = {
      firstName: "J",
      lastName: "Pérez",
      phone: "091234567",
      email: "juan@example.com",
      profession: "psicologo",
      password: "password123",
      confirmPassword: "password123",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("2 caracteres");
  });
});

describe("reservationSchema", () => {
  it("should validate correct reservation data", () => {
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    const validData = {
      date: tomorrow,
      startTime: "10:00",
      endTime: "11:00",
      resourceId: 1,
      tipo: "Eventual",
      usaCamilla: "No",
    };
    const result = reservationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject past dates", () => {
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const invalidData = {
      date: yesterday,
      startTime: "10:00",
      endTime: "11:00",
      resourceId: 1,
      tipo: "Eventual",
      usaCamilla: "No",
    };
    const result = reservationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("a partir de hoy");
  });

  it("should accept today's date", () => {
    const today = dayjs().format("YYYY-MM-DD");
    const validData = {
      date: today,
      startTime: "10:00",
      endTime: "11:00",
      resourceId: 1,
      tipo: "Eventual",
      usaCamilla: "No",
    };
    const result = reservationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject reservation less than 1 hour", () => {
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    const invalidData = {
      date: tomorrow,
      startTime: "10:00",
      endTime: "10:30",
      resourceId: 1,
      tipo: "Eventual",
      usaCamilla: "No",
    };
    const result = reservationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("al menos una hora");
  });

  it("should reject end time before start time", () => {
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    const invalidData = {
      date: tomorrow,
      startTime: "11:00",
      endTime: "10:00",
      resourceId: 1,
      tipo: "Eventual",
      usaCamilla: "No",
    };
    const result = reservationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    // The schema checks minimum duration first, then end time > start time
    // Either error message is acceptable since both conditions fail
    const errorMessage = result.error?.issues[0].message;
    expect(
      errorMessage.includes("posterior a la hora de inicio") ||
      errorMessage.includes("al menos una hora")
    ).toBe(true);
  });

  it("should reject invalid time format", () => {
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    const invalidData = {
      date: tomorrow,
      startTime: "25:00",
      endTime: "11:00",
      resourceId: 1,
      tipo: "Eventual",
      usaCamilla: "No",
    };
    const result = reservationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject null resourceId", () => {
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    const invalidData = {
      date: tomorrow,
      startTime: "10:00",
      endTime: "11:00",
      resourceId: null,
      tipo: "Eventual",
      usaCamilla: "No",
    };
    const result = reservationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("Selecciona un consultorio");
  });

  it("should reject invalid tipo", () => {
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    const invalidData = {
      date: tomorrow,
      startTime: "10:00",
      endTime: "11:00",
      resourceId: 1,
      tipo: "Invalid",
      usaCamilla: "No",
    };
    const result = reservationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("should validate correct profile data", () => {
    const validData = {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "091234567",
      profession: "Psicólogo",
    };
    const result = profileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid phone format", () => {
    const invalidData = {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "12345678",
      profession: "Psicólogo",
    };
    const result = profileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should transform phone removing non-digits", () => {
    const data = {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "09-123-4567",
      profession: "Psicólogo",
    };
    const result = profileSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data?.phone).toBe("091234567");
  });
});

describe("passwordSchema", () => {
  it("should validate matching passwords", () => {
    const validData = {
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    };
    const result = passwordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject short password", () => {
    const invalidData = {
      newPassword: "12345",
      confirmPassword: "12345",
    };
    const result = passwordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("6 caracteres");
  });

  it("should reject mismatched passwords", () => {
    const invalidData = {
      newPassword: "password123",
      confirmPassword: "different123",
    };
    const result = passwordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("no coinciden");
  });
});
