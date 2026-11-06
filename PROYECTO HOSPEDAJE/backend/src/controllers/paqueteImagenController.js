import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import crypto from 'crypto';
import { query } from '../config/db.js';

const paquetesUploadsDir = path.resolve('uploads', 'paquetes');
fs.mkdirSync(paquetesUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, paquetesUploadsDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `paquete-${crypto.randomUUID()}${extension}`);
  }
});

export const uploadPaqueteImagenes = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 10,
    fields: 2,
    fieldSize: 100 * 1024
  },
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!permitidos.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP.'));
    }

    cb(null, true);
  }
});

async function validarImagen(file) {
  const buffer = Buffer.alloc(16);
  const handle = await fsp.open(file.path, 'r');

  try {
    await handle.read(buffer, 0, buffer.length, 0);
  } finally {
    await handle.close();
  }

  const extension = path.extname(file.originalname).toLowerCase();

  const esJpeg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  const esPng = buffer
    .subarray(0, 8)
    .equals(
      Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a
      ])
    );

  const esWebp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  return (
    ((extension === '.jpg' || extension === '.jpeg') && esJpeg) ||
    (extension === '.png' && esPng) ||
    (extension === '.webp' && esWebp)
  );
}

export async function validarImagenesPaquete(req, res, next) {
  try {
    const archivos = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];

    for (const archivo of archivos) {
      if (!(await validarImagen(archivo))) {
        await Promise.all(
          archivos.map((archivoActual) =>
            fsp.unlink(archivoActual.path).catch(() => {})
          )
        );

        return res.status(400).json({
          message:
            'El contenido de una de las imágenes no coincide con su extensión. Solo se permiten JPG, PNG o WEBP.'
        });
      }
    }

    next();
  } catch (error) {
    const archivos = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];

    await Promise.all(
      archivos.map((archivo) =>
        fsp.unlink(archivo.path).catch(() => {})
      )
    );

    next(error);
  }
}

async function obtenerPaquete(id) {
  const rows = await query(
    'SELECT id, disponibilidad, estado FROM paquetes WHERE id = ? LIMIT 1',
    [id]
  );

  return rows?.[0] || null;
}

export async function listarImagenesPaquete(req, res, next) {
  try {
    const paquete = await obtenerPaquete(req.params.id);

    if (!paquete) {
      return res.status(404).json({
        message: 'Paquete no encontrado.'
      });
    }

    if (req.user?.rol === 'Cliente') {
      const estado = String(paquete.estado ?? '')
        .trim()
        .toLowerCase();

      const disponible =
        Number(paquete.disponibilidad) === 1 ||
        paquete.disponibilidad === true;

      const visible =
        disponible &&
        ['activo', 'en_promocion', '1', 'true'].includes(estado);

      if (!visible) {
        return res.status(403).json({
          message: 'Este paquete no está disponible para consulta.'
        });
      }
    }

    const imagenes = await query(
      `SELECT
         id,
         id_paquete,
         archivo,
         nombre_original,
         orden,
         created_at
       FROM paquete_imagenes
       WHERE id_paquete = ?
       ORDER BY orden ASC, id ASC`,
      [req.params.id]
    );

    return res.json({
      imagenes: imagenes || []
    });
  } catch (error) {
    next(error);
  }
}

export async function subirImagenesPaquete(req, res, next) {
  try {
    const paquete = await obtenerPaquete(req.params.id);
    const archivos = Array.isArray(req.files) ? req.files : [];

    if (!paquete) {
      await Promise.all(
        archivos.map((archivo) =>
          fsp.unlink(archivo.path).catch(() => {})
        )
      );

      return res.status(404).json({
        message: 'Paquete no encontrado.'
      });
    }

    if (!archivos.length) {
      return res.status(422).json({
        message: 'Selecciona al menos una imagen.'
      });
    }

    const existentes = await query(
      'SELECT COALESCE(MAX(orden), -1) AS ultimo_orden FROM paquete_imagenes WHERE id_paquete = ?',
      [req.params.id]
    );

    let orden = Number(existentes?.[0]?.ultimo_orden ?? -1) + 1;

    for (const archivo of archivos) {
      await query(
        `INSERT INTO paquete_imagenes
          (id_paquete, archivo, nombre_original, orden)
         VALUES (?, ?, ?, ?)`,
        [
          req.params.id,
          archivo.filename,
          archivo.originalname,
          orden++
        ]
      );
    }

    return res.status(201).json({
      message: 'Imágenes agregadas correctamente.'
    });
  } catch (error) {
    await Promise.all(
      (req.files || []).map((archivo) =>
        fsp.unlink(archivo.path).catch(() => {})
      )
    );

    next(error);
  }
}

export async function cambiarImagenPaquete(req, res, next) {
  try {
    if (!req.file) {
      return res.status(422).json({
        message: 'Selecciona una nueva imagen.'
      });
    }

    const rows = await query(
      `SELECT id, archivo
       FROM paquete_imagenes
       WHERE id = ? AND id_paquete = ?
       LIMIT 1`,
      [req.params.imagenId, req.params.id]
    );

    if (!rows?.[0]) {
      await fsp.unlink(req.file.path).catch(() => {});

      return res.status(404).json({
        message: 'Imagen no encontrada para este paquete.'
      });
    }

    const anterior = rows[0];

    await query(
      `UPDATE paquete_imagenes
       SET archivo = ?, nombre_original = ?
       WHERE id = ? AND id_paquete = ?`,
      [
        req.file.filename,
        req.file.originalname,
        req.params.imagenId,
        req.params.id
      ]
    );

    await fsp
      .unlink(
        path.join(
          paquetesUploadsDir,
          path.basename(anterior.archivo)
        )
      )
      .catch(() => {});

    return res.json({
      message: 'Imagen reemplazada correctamente.'
    });
  } catch (error) {
    if (req.file?.path) {
      await fsp.unlink(req.file.path).catch(() => {});
    }

    next(error);
  }
}

export async function eliminarImagenPaquete(req, res, next) {
  try {
    const rows = await query(
      `SELECT archivo
       FROM paquete_imagenes
       WHERE id = ? AND id_paquete = ?
       LIMIT 1`,
      [req.params.imagenId, req.params.id]
    );

    if (!rows?.[0]) {
      return res.status(404).json({
        message: 'Imagen no encontrada para este paquete.'
      });
    }

    await query(
      `DELETE FROM paquete_imagenes
       WHERE id = ? AND id_paquete = ?`,
      [req.params.imagenId, req.params.id]
    );

    await fsp
      .unlink(
        path.join(
          paquetesUploadsDir,
          path.basename(rows[0].archivo)
        )
      )
      .catch(() => {});

    return res.json({
      message: 'Imagen eliminada correctamente.'
    });
  } catch (error) {
    next(error);
  }
}

export async function servirImagenPaquete(req, res, next) {
  try {
    const filename = path.basename(req.params.filename);

    const rows = await query(
      'SELECT id FROM paquete_imagenes WHERE archivo = ? LIMIT 1',
      [filename]
    );

    if (!rows?.[0]) {
      return res.status(404).send('Imagen no encontrada.');
    }

    const filePath = path.join(paquetesUploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Imagen no encontrada.');
    }

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
}
