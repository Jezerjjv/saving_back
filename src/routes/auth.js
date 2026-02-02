import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { requireAuth, JWT_SECRET } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 10;

function rowUser(r) {
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    name: r.name || '',
    pin_enabled: !!r.pin_enabled,
    bio_enabled: !!r.bio_enabled,
    pin_hash: r.pin_hash && String(r.pin_hash).length === 64 ? r.pin_hash : null,
  };
}

/** POST /api/auth/register — registrar usuario */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name = '' } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'El email es obligatorio' });
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [emailNorm]);
    if (existing.length > 0) return res.status(409).json({ error: 'Ese email ya está registrado' });

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const { rows } = await query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, pin_enabled, bio_enabled, pin_hash',
      [emailNorm, passwordHash, String(name).trim().slice(0, 255)]
    );
    const user = rowUser(rows[0]);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/auth/login — iniciar sesión */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'El email es obligatorio' });
    if (!password) return res.status(400).json({ error: 'La contraseña es obligatoria' });

    const emailNorm = String(email).trim().toLowerCase();
    const { rows } = await query(
      'SELECT id, email, name, password_hash, pin_enabled, bio_enabled, pin_hash FROM users WHERE email = $1',
      [emailNorm]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    const userRow = rows[0];
    const ok = await bcrypt.compare(String(password), userRow.password_hash);
    if (!ok) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    const user = rowUser(userRow);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/auth/me — usuario actual (requiere token) */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, email, name, pin_enabled, bio_enabled, pin_hash FROM users WHERE id = $1',
      [req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rowUser(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/auth/me — actualizar perfil o preferencias PIN/bio */
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { name, password, pin_enabled, bio_enabled, pin_hash } = req.body;
    const updates = [];
    const params = [];
    let n = 1;
    if (name !== undefined) {
      updates.push(`name = $${n++}`);
      params.push(String(name).trim().slice(0, 255));
    }
    if (password !== undefined && String(password).length > 0) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }
      const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
      updates.push(`password_hash = $${n++}`);
      params.push(passwordHash);
    }
    if (pin_enabled !== undefined) {
      updates.push(`pin_enabled = $${n++}`);
      params.push(!!pin_enabled);
      if (!pin_enabled) {
        updates.push(`pin_hash = $${n++}`);
        params.push(null);
      }
    }
    if (pin_hash !== undefined && String(pin_hash).length === 64 && /^[a-f0-9]+$/i.test(String(pin_hash))) {
      updates.push(`pin_hash = $${n++}`);
      params.push(String(pin_hash).toLowerCase());
    }
    if (bio_enabled !== undefined) {
      updates.push(`bio_enabled = $${n++}`);
      params.push(!!bio_enabled);
    }
    if (updates.length === 0) {
      const { rows } = await query(
        'SELECT id, email, name, pin_enabled, bio_enabled, pin_hash FROM users WHERE id = $1',
        [req.userId]
      );
      return res.json(rowUser(rows[0]));
    }
    params.push(req.userId);
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${n} RETURNING id, email, name, pin_enabled, bio_enabled, pin_hash`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rowUser(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
