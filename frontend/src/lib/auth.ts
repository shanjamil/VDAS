const AUTH_KEY = "vdas:auth";
const ACCESS_TOKEN_KEY = "vdas:accessToken";
const REFRESH_TOKEN_KEY = "vdas:refreshToken";
const USER_KEY = "vdas:user";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const isBrowser = () => typeof window !== "undefined";

type LoginResponse = {
  status: "success";
  data: {
    user: {
      id: number;
      email: string;
      name: string;
    };
    token: {
      refresh: string;
      access: string;
    };
  };
};

type RegisterResponse = LoginResponse;

type ErrorResponse = {
  status: "error";
  message: string;
};

const parseApiPayload = async <T>(response: Response): Promise<T | ErrorResponse> => {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (contentType.includes("application/json")) {
    return JSON.parse(body) as T | ErrorResponse;
  }

  if (!body.trim()) {
    return {
      status: "error",
      message: "Backend returned an empty response.",
    };
  }

  return {
    status: "error",
    message: "Backend returned a server error page instead of JSON. Check the deployed backend logs.",
  };
};

const persistAuth = (payload: LoginResponse["data"]) => {
  localStorage.setItem(AUTH_KEY, "1");
  localStorage.setItem(ACCESS_TOKEN_KEY, payload.token.access);
  localStorage.setItem(REFRESH_TOKEN_KEY, payload.token.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
};

export const isAuthed = () => {
  if (!isBrowser()) return true;
  try {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)) || localStorage.getItem("vdas:guest") === "true";
  } catch {
    return false;
  }
};

export const isAuthedStrict = () => {
  if (!isBrowser()) return false;
  try {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  } catch {
    return false;
  }
};

export const isAuthedOrGuest = () => {
  if (!isBrowser()) return false;
  try {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)) || localStorage.getItem("vdas:guest") === "true";
  } catch {
    return false;
  }
};

export const isGuestUser = () => {
  if (!isBrowser()) return false;
  try {
    return localStorage.getItem("vdas:guest") === "true";
  } catch {
    return false;
  }
};

export const signIn = async (email: string, password: string) => {
  if (!isBrowser()) {
    throw new Error("Login is only available in the browser.");
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const payload = await parseApiPayload<LoginResponse>(response);

  if (!response.ok || payload.status !== "success") {
    const message = "message" in payload ? payload.message : "Login failed.";
    throw new Error(message);
  }

  // Clear guest status if they log in
  localStorage.removeItem("vdas:guest");
  persistAuth(payload.data);

  return payload.data;
};

export const signUp = async (name: string, email: string, password: string) => {
  if (!isBrowser()) {
    throw new Error("Signup is only available in the browser.");
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  const payload = await parseApiPayload<RegisterResponse>(response);

  if (!response.ok || payload.status !== "success") {
    const message = "message" in payload ? payload.message : "Signup failed.";
    throw new Error(message);
  }

  // Clear guest status if they register
  localStorage.removeItem("vdas:guest");
  return payload.data;
};

export const signOut = () => {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("vdas:guest");
  } catch {}
};
