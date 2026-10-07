// Thin fetch wrapper: same-origin JSON calls, cookie-based EBS session, friendly errors.

const DEFAULT_MESSAGES = {
  0: 'Unable to reach the EBS server. Please check your connection and try again.',
  400: 'The request could not be processed. Please check the details and try again.',
  401: 'Your EBS session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested information was not found.',
  409: 'This record already exists.',
  429: 'Too many attempts. Please wait a few minutes and try again.',
  500: 'Something went wrong on our side. Please try again in a moment.',
};

export class ApiError extends Error {
  constructor(status, message, data = {}) {
    super(message);
    this.status = status;
    this.code = data.code || null;
    this.errors = data.errors || null;
    this.field = data.field || null;
  }
}

const unauthorizedHandlers = [];
export function onUnauthorized(handler) {
  unauthorizedHandlers.push(handler);
}

export async function request(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      // A redirect here means OAuth2 Proxy wants to re-authenticate (gateway session ended).
      redirect: 'manual',
      headers: body !== undefined
        ? { Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, DEFAULT_MESSAGES[0]);
  }

  if (res.type === 'opaqueredirect') {
    throw new ApiError(401, 'Your secure gateway session has ended. Reload the page to sign in through MFA again.', {
      code: 'GATEWAY_SESSION_ENDED',
    });
  }

  let data = null;
  const type = res.headers.get('Content-Type') || '';
  if (type.includes('application/json')) {
    try { data = await res.json(); } catch (e) { data = null; }
  }

  if (!res.ok || !data || data.success === false) {
    const status = res.ok ? 500 : res.status;
    const message = (data && data.message) || DEFAULT_MESSAGES[status] || DEFAULT_MESSAGES[status >= 500 ? 500 : 400];
    const err = new ApiError(status, message, data || {});
    if (status === 401 && err.code !== 'INVALID_CREDENTIALS') {
      unauthorizedHandlers.forEach((h) => h(err));
    }
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
};
