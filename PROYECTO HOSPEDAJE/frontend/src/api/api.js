const API_URL = '/api/v1';

function obtenerToken() {
  const posiblesClaves = [
    'token',
    'accessToken',
    'access_token',
    'authToken',
    'jwt'
  ];

  for (const clave of posiblesClaves) {
    const valor = localStorage.getItem(clave);

    if (valor) {
      try {
        const objeto = JSON.parse(valor);

        if (typeof objeto === 'string') {
          return objeto;
        }

        if (objeto?.token) {
          return objeto.token;
        }

        if (objeto?.accessToken) {
          return objeto.accessToken;
        }

        if (objeto?.access_token) {
          return objeto.access_token;
        }
      } catch {
        return valor;
      }
    }
  }

  return null;
}

async function request(endpoint, options = {}) {
  const token = obtenerToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const contentType =
    response.headers.get('content-type') || '';

  let data;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const mensaje =
      data?.message ||
      data?.error ||
      'Ocurrió un error al comunicarse con el servidor';

    throw new Error(mensaje);
  }

  return data;
}

export async function apiGet(endpoint, options = {}) {
  return request(endpoint, {
    method: 'GET',
    ...options
  });
}

export async function apiPost(endpoint, body, options = {}) {
  return request(endpoint, {
    method: 'POST',
    ...options,
    body: JSON.stringify(body)
  });
}

export async function apiPut(endpoint, body, options = {}) {
  return request(endpoint, {
    method: 'PUT',
    ...options,
    body: JSON.stringify(body)
  });
}

export async function apiPatch(endpoint, body, options = {}) {
  return request(endpoint, {
    method: 'PATCH',
    ...options,
    body: JSON.stringify(body)
  });
}

export async function apiDelete(endpoint, options = {}) {
  return request(endpoint, {
    method: 'DELETE',
    ...options
  });
}

/*
 * Objeto API compatible con los módulos
 * que utilizan:
 *
 * import { api } from '../api/api';
 */
export const api = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete
};

export default {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  api
};