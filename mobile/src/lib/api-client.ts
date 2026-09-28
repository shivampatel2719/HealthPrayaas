const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Add it to mobile/.env');
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (response.status === 401) {
      const { useAuthStore } = await import('@/store/auth-store');
      useAuthStore.getState().logout();
    }
    const message =
      data && typeof data === 'object' && 'error' in data
        ? (data as { error: string }).error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}
