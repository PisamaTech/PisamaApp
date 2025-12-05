import { describe, it, expect, vi, beforeEach } from "vitest";

// Create persistent mocks using vi.hoisted
const mockUIStore = vi.hoisted(() => ({
  startLoading: vi.fn(),
  stopLoading: vi.fn(),
  setError: vi.fn(),
  clearError: vi.fn(),
  showToast: vi.fn(),
}));

const mockSupabase = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
}));

// Mock Supabase
vi.mock("../../supabase/supabase.config.js", () => ({
  supabase: mockSupabase,
}));

// Mock UIStore with persistent mock
vi.mock("../uiStore", () => ({
  useUIStore: {
    getState: () => mockUIStore,
  },
}));

import { useAuthStore } from "../authStore";

describe("authStore", () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      loading: false,
      error: null,
      profile: null,
    });

    // Clear all mock calls but keep the same functions
    Object.values(mockUIStore).forEach(fn => fn.mockClear());
    Object.values(mockSupabase.auth).forEach(fn => fn.mockClear());
    mockSupabase.from.mockClear();
  });

  describe("checkSession", () => {
    it("should load user and profile when session exists", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      const mockProfile = {
        id: "user-123",
        firstName: "Juan",
        lastName: "Pérez",
        role: "user",
      };

      // Mock successful session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "token-123" } },
        error: null,
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile query
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockSingle,
          })),
        })),
      });

      const { checkSession } = useAuthStore.getState();
      await checkSession();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.profile).toEqual(mockProfile);

      // Verify UI interactions
      expect(mockUIStore.startLoading).toHaveBeenCalledWith("Cargando usuario...");
      expect(mockUIStore.stopLoading).toHaveBeenCalled();
    });

    it("should clear user when no session exists", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { checkSession } = useAuthStore.getState();
      await checkSession();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
    });

    it("should handle session error", async () => {
      const mockError = { message: "Session error" };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      const { checkSession } = useAuthStore.getState();

      // Function handles error internally without rejecting
      await checkSession();

      expect(mockUIStore.setError).toHaveBeenCalledWith(mockError);
      expect(mockUIStore.showToast).toHaveBeenCalledWith({
        type: "error",
        title: "Error",
        message: mockError.message,
      });
    });

    it("should handle profile fetch error", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockError = { message: "Profile not found" };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "token" } },
        error: null,
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockSingle,
          })),
        })),
      });

      const { checkSession } = useAuthStore.getState();

      // Function handles error internally without rejecting
      await checkSession();

      expect(mockUIStore.setError).toHaveBeenCalledWith(mockError);
      expect(mockUIStore.showToast).toHaveBeenCalledWith({
        type: "error",
        title: "Error",
        message: mockError.message,
      });
    });
  });

  describe("signUp", () => {
    it("should register new user successfully", async () => {
      const mockAuthData = {
        user: { id: "new-user-123", email: "new@example.com" },
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      const { signUp } = useAuthStore.getState();
      const result = await signUp(
        "new@example.com",
        "password123",
        "Juan",
        "Pérez",
        "091234567",
        "psicologo"
      );

      expect(result).toBe(true);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: {
          data: {
            firstName: "Juan",
            lastName: "Pérez",
            phone: "091234567",
            profession: "psicologo",
          },
          emailRedirectTo: "https://reservas.pisama.uy/confirmacion",
        },
      });

      expect(mockUIStore.showToast).toHaveBeenCalledWith({
        type: "success",
        title: "Registro exitoso",
        message: expect.stringContaining("email"),
      });
    });

    it("should handle signup error", async () => {
      const mockError = { message: "Email already exists" };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { signUp } = useAuthStore.getState();
      const result = await signUp(
        "existing@example.com",
        "password123",
        "Juan",
        "Pérez",
        "091234567",
        "psicologo"
      );

      expect(result).toBe(false);

      expect(mockUIStore.setError).toHaveBeenCalledWith(mockError);
      expect(mockUIStore.showToast).toHaveBeenCalledWith({
        type: "error",
        title: "Error de registro",
        message: mockError.message,
      });
    });
  });

  describe("signIn", () => {
    it("should sign in user successfully", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      const mockProfile = {
        id: "user-123",
        firstName: "Juan",
        lastName: "Pérez",
        role: "user",
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockSingle,
          })),
        })),
      });

      const { signIn } = useAuthStore.getState();
      await signIn("test@example.com", "password123");

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.profile).toEqual(mockProfile);

      expect(mockUIStore.startLoading).toHaveBeenCalledWith("Logueando usuario...");
      expect(mockUIStore.stopLoading).toHaveBeenCalled();
    });

    it("should handle invalid credentials", async () => {
      const mockError = { message: "Invalid login credentials" };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { signIn } = useAuthStore.getState();

      // Function handles error internally without rejecting
      await signIn("wrong@example.com", "wrongpass");

      expect(mockUIStore.setError).toHaveBeenCalledWith(mockError);
      expect(mockUIStore.showToast).toHaveBeenCalledWith({
        type: "error",
        title: "Error",
        message: mockError.message,
      });
    });
  });

  describe("signOut", () => {
    it("should sign out user successfully", async () => {
      // Set initial state with user
      useAuthStore.setState({
        user: { id: "user-123" },
        profile: { firstName: "Juan" },
      });

      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const { signOut } = useAuthStore.getState();
      await signOut();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();

      expect(mockUIStore.startLoading).toHaveBeenCalledWith("Cerrando sesión...");
      expect(mockUIStore.stopLoading).toHaveBeenCalled();
    });

    it("should handle signout error", async () => {
      const mockError = { message: "Signout failed" };

      mockSupabase.auth.signOut.mockResolvedValue({
        error: mockError,
      });

      const { signOut } = useAuthStore.getState();

      // Function handles error internally without rejecting
      await signOut();

      expect(mockUIStore.setError).toHaveBeenCalledWith(mockError);
      expect(mockUIStore.showToast).toHaveBeenCalledWith({
        type: "error",
        title: "Error",
        message: mockError.message,
      });
    });
  });

  describe("updateProfileData", () => {
    it("should update profile data", () => {
      const initialProfile = {
        id: "user-123",
        firstName: "Juan",
        lastName: "Pérez",
        phone: "091234567",
      };

      useAuthStore.setState({ profile: initialProfile });

      const { updateProfileData } = useAuthStore.getState();
      updateProfileData({
        firstName: "Carlos",
        phone: "099876543",
      });

      const state = useAuthStore.getState();
      expect(state.profile).toEqual({
        id: "user-123",
        firstName: "Carlos",
        lastName: "Pérez",
        phone: "099876543",
      });
    });

    it("should handle updating null profile", () => {
      useAuthStore.setState({ profile: null });

      const { updateProfileData } = useAuthStore.getState();
      updateProfileData({ firstName: "New Name" });

      const state = useAuthStore.getState();
      expect(state.profile).toEqual({ firstName: "New Name" });
    });
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.profile).toBeNull();
    });
  });
});
