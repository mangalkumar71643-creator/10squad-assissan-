import { customFetch, type Player } from "@workspace/api-client-react";

const TOKEN_KEY = "10squad_auth_token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode etc.) — session just won't persist.
  }
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

interface AuthResponse {
  token: string;
  player: Player;
}

export function registerWithEmail(email: string, password: string): Promise<AuthResponse> {
  return customFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  return customFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginAsGuest(): Promise<AuthResponse> {
  return customFetch<AuthResponse>("/api/auth/guest", { method: "POST" });
}

export function loginWithFacebook(accessToken: string): Promise<AuthResponse> {
  return customFetch<AuthResponse>("/api/auth/facebook", {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });
}

export function logout(): void {
  setStoredToken(null);
}
