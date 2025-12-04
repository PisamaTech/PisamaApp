import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminRouteGuard from "../AdminRouteGuard";
import { useAuthStore } from "@/stores/authStore";

// Mock the Navigate component
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }) => <div data-testid="navigate">Redirecting to {to}</div>,
  };
});

// Mock the auth store
vi.mock("@/stores/authStore", () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

describe("AdminRouteGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear console.warn spy
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("should render children when user is admin", () => {
    // Mock admin profile
    useAuthStore.getState.mockReturnValue({
      profile: {
        id: "user-123",
        role: "admin",
        firstName: "Admin",
        lastName: "User",
      },
    });

    render(
      <BrowserRouter>
        <AdminRouteGuard>
          <div data-testid="admin-content">Admin Page Content</div>
        </AdminRouteGuard>
      </BrowserRouter>
    );

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    expect(screen.getByText("Admin Page Content")).toBeInTheDocument();
  });

  it("should redirect to dashboard when user is not admin", () => {
    // Mock non-admin profile
    useAuthStore.getState.mockReturnValue({
      profile: {
        id: "user-456",
        role: "user",
        firstName: "Regular",
        lastName: "User",
      },
    });

    render(
      <BrowserRouter>
        <AdminRouteGuard>
          <div data-testid="admin-content">Admin Page Content</div>
        </AdminRouteGuard>
      </BrowserRouter>
    );

    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("navigate")).toBeInTheDocument();
    expect(screen.getByText(/Redirecting to \/dashboard/)).toBeInTheDocument();
  });

  it("should redirect when profile is null", () => {
    // Mock null profile (user not logged in)
    useAuthStore.getState.mockReturnValue({
      profile: null,
    });

    render(
      <BrowserRouter>
        <AdminRouteGuard>
          <div data-testid="admin-content">Admin Page Content</div>
        </AdminRouteGuard>
      </BrowserRouter>
    );

    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("navigate")).toBeInTheDocument();
  });

  it("should redirect when profile is undefined", () => {
    // Mock undefined profile
    useAuthStore.getState.mockReturnValue({
      profile: undefined,
    });

    render(
      <BrowserRouter>
        <AdminRouteGuard>
          <div data-testid="admin-content">Admin Page Content</div>
        </AdminRouteGuard>
      </BrowserRouter>
    );

    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("navigate")).toBeInTheDocument();
  });

  it("should log warning when access is denied", () => {
    const warnSpy = vi.spyOn(console, "warn");

    useAuthStore.getState.mockReturnValue({
      profile: {
        role: "user",
      },
    });

    render(
      <BrowserRouter>
        <AdminRouteGuard>
          <div>Admin Content</div>
        </AdminRouteGuard>
      </BrowserRouter>
    );

    expect(warnSpy).toHaveBeenCalledWith(
      "Acceso denegado a ruta de admin. Redirigiendo a /dashboard."
    );
  });

  it("should handle profile with different role values", () => {
    const testCases = [
      { role: "user", shouldAllow: false },
      { role: "admin", shouldAllow: true },
      { role: "moderator", shouldAllow: false },
      { role: "", shouldAllow: false },
      { role: null, shouldAllow: false },
    ];

    testCases.forEach(({ role, shouldAllow }) => {
      useAuthStore.getState.mockReturnValue({
        profile: { role },
      });

      const { unmount } = render(
        <BrowserRouter>
          <AdminRouteGuard>
            <div data-testid="admin-content">Admin Content</div>
          </AdminRouteGuard>
        </BrowserRouter>
      );

      if (shouldAllow) {
        expect(screen.getByTestId("admin-content")).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
        expect(screen.getByTestId("navigate")).toBeInTheDocument();
      }

      unmount();
    });
  });
});
