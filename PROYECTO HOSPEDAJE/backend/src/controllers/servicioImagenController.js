import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import crypto from 'crypto';
import { query } from '../config/db.js';

const serviciosUploadsDir = path.resolve('uploads', 'servicios');
fs.mkdirSync(serviciosUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, serviciosUploadsDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `servicio-${crypto.randomUUID()}${extension}`);
  }
});

export const uploadServicioImagenes = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 10, fields: 2, fieldSize: 100 * 1024 },
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!permitidos.includes(file.mimetype)) return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP.'));
    cb(null, true);
  }
});

async function validarImagen(file) {
  const buffer = Buffer.alloc(16);
  const handle = await fsp.open(file.path, 'r');
  try { await handle.read(buffer, 0, buffer.length, 0); } finally { await handle.close(); }
  const extension = path.extname(file.originalname).toLowerCase();
  const esJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const esPng = buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  const esWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return ((extension === '.jpg' || extension === '.jpeg') && esJpeg) || (extension === '.png' && esPng) || (extension === '.webp' && esWebp);
}

export async function validarImagenesServicio(req, res, next) {
  try {
    const archivos = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
    for (const archivo of archivos) {
      if (!(await validarImagen(archivo))) {
        await Promise.all(archivos.map((a) => fsp.unlink(a.path).catch(() => {})));
        return res.status(400).json({ message: 'El contenido de una de las imágenes no coincide con su extensión. Solo se permiten JPG, PNG o WEBP.' });
      }
    }
    next();
  } catch (error) {
    const archivos = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
    await Promise.all(archivos.map((a) => fsp.unlink(a.path).catch(() => {})));
    next(error);
  }
}

async function obtenerServicio(id) {
  const rows = await query('SELECT id, disponibilidad, estado FROM servicios WHERE id = ? LIMIT 1', [id]);
  return rows?.[0] || null;
}

export async function listarImagenesServicio(req, res, next) {
  try {
    const servicio = await obtenerServicio(req.params.id);
    if (!servicio) return res.status(404).json({ message: 'Servicio no encontrado.' });
    if (req.user?.rol === 'Cliente' && (Number(servicio.disponibilidad) !== 1 || Number(servicio.estado) !== 1)) return res.status(403).json({ message: 'Este servicio no está disponible para consulta.' });
    const imagenes = await query(`SELECT id, id_servicio, archivo, nombre_original, orden, created_at FROM servicio_imagenes WHERE id_servicio = ? ORDER BY orden ASC, id ASC`, [req.params.id]);
    return res.json({ imagenes: imagenes || [] });
  } catch (error) { next(error); }
}

export async function subirImagenesServicio(req, res, next) {
  try {
    const servicio = await obtenerServicio(req.params.id);
    const archivos = Array.isArray(req.files) ? req.files : [];
    if (!servicio) { await Promise.all(archivos.map((a) => fsp.unlink(a.path).catch(() => {}))); return res.status(404).json({ message: 'Servicio no encontrado.' }); }
    if (!archivos.length) return res.status(422).json({ message: 'Selecciona al menos una imagen.' });
    const existentes = await query('SELECT COALESCE(MAX(orden), -1) AS ultimo_orden FROM servicio_imagenes WHERE id_servicio = ?', [req.params.id]);
    let orden = Number(existentes?.[0]?.ultimo_orden ?? -1) + 1;
    for (const archivo of archivos) {
      await query('INSERT INTO servicio_imagenes (id_servicio, archivo, nombre_original, orden) VALUES (?, ?, ?, ?)', [req.params.id, archivo.filename, archivo.originalname, orden++]);
    }
    return res.status(201).json({ message: 'Imágenes agregadas correctamente.' });
  } catch (error) {
    await Promise.all((req.files || []).map((a) => fsp.unlink(a.path).catch(() => {})));
    next(error);
  }
}

export async function cambiarImagenServicio(req, res, next) {
  try {
    if (!req.file) return res.status(422).json({ message: 'Selecciona una nueva imagen.' });
    const rows = await query('SELECT id, archivo FROM servicio_imagenes WHERE id = ? AND id_servicio = ? LIMIT 1', [req.params.imagenId, req.params.id]);
    if (!rows?.[0]) { await fsp.unlink(req.file.path).catch(() => {}); return res.status(404).json({ message: 'Imagen no encontrada para este servicio.' }); }
    const anterior = rows[0];
    await query('UPDATE servicio_imagenes SET archivo = ?, nombre_original = ? WHERE id = ? AND id_servicio = ?', [req.file.filename, req.file.originalname, req.params.imagenId, req.params.id]);
    await fsp.unlink(path.join(serviciosUploadsDir, path.basename(anterior.archivo))).catch(() => {});
    return res.json({ message: 'Imagen reemplazada correctamente.' });
  } catch (error) { if (req.file?.path) await fsp.unlink(req.file.path).catch(() => {}); next(error); }
}

export async function eliminarImagenServicio(req, res, next) {
  try {
    const rows = await query('SELECT archivo FROM servicio_imagenes WHERE id = ? AND id_servicio = ? LIMIT 1', [req.params.imagenId, req.params.id]);
    if (!rows?.[0]) return res.status(404).json({ message: 'Imagen no encontrada para este servicio.' });
    await query('DELETE FROM servicio_imagenes WHERE id = ? AND id_servicio = ?', [req.params.imagenId, req.params.id]);
    await fsp.unlink(path.join(serviciosUploadsDir, path.basename(rows[0].archivo))).catch(() => {});
    return res.json({ message: 'Imagen eliminada correctamente.' });
  } catch (error) { next(error); }
}

export async function servirImagenServicio(req, res, next) {
  try {
    const filename = path.basename(req.params.filename);
    const rows = await query('SELECT id FROM servicio_imagenes WHERE archivo = ? LIMIT 1', [filename]);
    if (!rows?.[0]) return res.status(404).send('Imagen no encontrada.');
    const filePath = path.join(serviciosUploadsDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('Imagen no encontrada.');
    return res.sendFile(filePath);
  } catch (error) { next(error); }
}
