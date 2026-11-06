const buckets = new Map();

function rateLimit({ windowMs, max, keyGenerator, message }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ message });
    }

    next();
  };
}

const normalize = (value) => String(value || '').trim().toLowerCase();
const ip = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: (req) => `login:${ip(req)}:${normalize(req.body?.correo)}`,
  message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente más tarde.'
});

export const recoveryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `recovery:${ip(req)}:${normalize(req.body?.correo)}`,
  message: 'Demasiadas solicitudes de recuperación. Intenta nuevamente más tarde.'
});

export const resetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `reset:${ip(req)}`,
  message: 'Demasiados intentos de restablecimiento. Intenta nuevamente más tarde.'
});

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}
