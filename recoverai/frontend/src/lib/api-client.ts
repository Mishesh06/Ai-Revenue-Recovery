const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export class ApiError extends Error {
  public status: number;
  public details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface FetchOptions extends RequestInit {
  merchantId?: string | null;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { merchantId, params, ...init } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers = new Headers(init.headers);
  if (merchantId) {
    headers.set("X-Merchant-ID", merchantId);
  }
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  // Ensure requests can be cancelled / timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText };
      }
      const message =
        errorData?.error?.message ||
        errorData?.detail ||
        errorData?.message ||
        `Request failed with status ${response.status}`;
      throw new ApiError(
        typeof message === "string" ? message : JSON.stringify(message),
        response.status,
        errorData
      );
    }

    // Handle empty responses
    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json();
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Request timed out", 408);
    }
    throw error;
  }
}
