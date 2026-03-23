import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://onia.dkerasiotis.gr';

export function getApiUrl() {
  return API_URL;
}

export async function apiFetch(path, options = {}) {
  const token = await SecureStore.getItemAsync('jwt_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    await SecureStore.deleteItemAsync('jwt_token');
    throw new Error('AUTH_EXPIRED');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Σφάλμα');
  return data;
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Λάθος στοιχεία σύνδεσης');
  await SecureStore.setItemAsync('jwt_token', data.token);
  return data.user;
}

export async function logout() {
  await SecureStore.deleteItemAsync('jwt_token');
}
