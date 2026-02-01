import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'saving-dev-secret-change-in-production';

/**
 * Middleware: exige token JWT válido y pone req.userId.
 * Responde 401 si no hay token o es inválido.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export { JWT_SECRET };
