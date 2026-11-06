import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import crypto from 'crypto';

import { query } from '../config/db.js';


/* =========================================================
   DIRECTORIO DE IMÁGENES DE HABITACIONES
========================================================= */

const habitacionesUploadsDir =
  path.resolve('uploads', 'habitaciones');

fs.mkdirSync(
  habitacionesUploadsDir,
  {
    recursive: true
  }
);


/* =========================================================
   MULTER PARA IMÁGENES DE HABITACIONES
========================================================= */

const storage =
  multer.diskStorage({

    destination: (
      req,
      file,
      cb
    ) => {

      cb(
        null,
        habitacionesUploadsDir
      );

    },

    filename: (
      req,
      file,
      cb
    ) => {

      const extension =
        path.extname(
          file.originalname
        ).toLowerCase();

      const nombreSeguro =
        `habitacion-${crypto.randomUUID()}${extension}`;

      cb(
        null,
        nombreSeguro
      );

    }

  });


export const uploadHabitacionImagenes =
  multer({

    storage,

    limits: {
      fileSize: 8 * 1024 * 1024,
      files: 10,
      fields: 2,
      fieldSize: 100 * 1024
    },

    fileFilter: (
      req,
      file,
      cb
    ) => {

      const permitidos = [
        'image/jpeg',
        'image/png',
        'image/webp'
      ];

      if (!permitidos.includes(file.mimetype)) {

        return cb(
          new Error(
            'Solo se permiten imágenes JPG, PNG o WEBP.'
          )
        );

      }

      cb(
        null,
        true
      );

    }

  });


/* =========================================================
   VALIDAR CONTENIDO REAL DE LA IMAGEN
========================================================= */

async function validarImagen(file) {

  const buffer =
    Buffer.alloc(16);

  const handle =
    await fsp.open(
      file.path,
      'r'
    );

  try {

    await handle.read(
      buffer,
      0,
      buffer.length,
      0
    );

  } finally {

    await handle.close();

  }

  const extension =
    path.extname(
      file.originalname
    ).toLowerCase();

  const esJpeg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  const esPng =
    buffer.subarray(0, 8).equals(
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
    (extension === '.jpg' || extension === '.jpeg') && esJpeg
  ) || (
    extension === '.png' && esPng
  ) || (
    extension === '.webp' && esWebp
  );
}


/* =========================================================
   VALIDAR ARCHIVOS SUBIDOS
========================================================= */

export async function validarImagenesHabitacion(
  req,
  res,
  next
) {

  try {

    const archivos =
      Array.isArray(req.files)
        ? req.files
        : req.file
          ? [req.file]
          : [];

    for (const archivo of archivos) {

      const valido =
        await validarImagen(
          archivo
        );

      if (!valido) {

        await Promise.all(
          archivos.map(
            archivoActual =>
              fsp.unlink(
                archivoActual.path
              ).catch(() => {})
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

    const archivos =
      Array.isArray(req.files)
        ? req.files
        : req.file
          ? [req.file]
          : [];

    await Promise.all(
      archivos.map(
        archivo =>
          fsp.unlink(
            archivo.path
          ).catch(() => {})
      )
    );

    next(error);

  }
}


/* =========================================================
   COMPROBAR HABITACIÓN
========================================================= */

async function obtenerHabitacion(id) {

  const rows =
    await query(
      `
        SELECT id, estado
        FROM habitaciones
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

  return rows?.[0] || null;
}


/* =========================================================
   LISTAR IMÁGENES
========================================================= */

export async function listarImagenesHabitacion(
  req,
  res,
  next
) {

  try {

    const habitacion =
      await obtenerHabitacion(
        req.params.id
      );

    if (!habitacion) {

      return res.status(404).json({
        message:
          'Habitación no encontrada.'
      });

    }

    if (
      req.user?.rol === 'Cliente' &&
      habitacion.estado !== 'disponible'
    ) {

      return res.status(403).json({
        message:
          'Esta habitación no está disponible para consulta.'
      });

    }

    const imagenes =
      await query(
        `
          SELECT
            id,
            id_habitacion,
            archivo,
            nombre_original,
            orden,
            created_at
          FROM habitacion_imagenes
          WHERE id_habitacion = ?
          ORDER BY orden ASC, id ASC
        `,
        [req.params.id]
      );

    return res.json({
      imagenes: imagenes || []
    });

  } catch (error) {

    next(error);

  }
}


/* =========================================================
   SUBIR IMÁGENES
========================================================= */

export async function subirImagenesHabitacion(
  req,
  res,
  next
) {

  try {

    const habitacion =
      await obtenerHabitacion(
        req.params.id
      );

    if (!habitacion) {

      await Promise.all(
        (req.files || []).map(
          archivo =>
            fsp.unlink(
              archivo.path
            ).catch(() => {})
        )
      );

      return res.status(404).json({
        message:
          'Habitación no encontrada.'
      });

    }

    const archivos =
      Array.isArray(req.files)
        ? req.files
        : [];

    if (!archivos.length) {

      return res.status(422).json({
        message:
          'Selecciona al menos una imagen.'
      });

    }

    const existentes =
      await query(
        `
          SELECT COALESCE(MAX(orden), -1) AS ultimo_orden
          FROM habitacion_imagenes
          WHERE id_habitacion = ?
        `,
        [req.params.id]
      );

    let orden =
      Number(
        existentes?.[0]?.ultimo_orden ?? -1
      ) + 1;

    for (const archivo of archivos) {

      await query(
        `
          INSERT INTO habitacion_imagenes
          (
            id_habitacion,
            archivo,
            nombre_original,
            orden
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          req.params.id,
          archivo.filename,
          archivo.originalname,
          orden
        ]
      );

      orden += 1;

    }

    return res.status(201).json({
      message:
        'Imágenes agregadas correctamente.'
    });

  } catch (error) {

    await Promise.all(
      (req.files || []).map(
        archivo =>
          fsp.unlink(
            archivo.path
          ).catch(() => {})
      )
    );

    next(error);

  }
}


/* =========================================================
   CAMBIAR UNA IMAGEN
========================================================= */

export async function cambiarImagenHabitacion(
  req,
  res,
  next
) {

  try {

    if (!req.file) {

      return res.status(422).json({
        message:
          'Selecciona una nueva imagen.'
      });

    }

    const rows =
      await query(
        `
          SELECT
            hi.id,
            hi.archivo,
            hi.id_habitacion
          FROM habitacion_imagenes hi
          WHERE hi.id = ?
            AND hi.id_habitacion = ?
          LIMIT 1
        `,
        [
          req.params.imagenId,
          req.params.id
        ]
      );

    if (!rows?.[0]) {

      await fsp.unlink(
        req.file.path
      ).catch(() => {});

      return res.status(404).json({
        message:
          'Imagen no encontrada para esta habitación.'
      });

    }

    const imagenActual =
      rows[0];

    await query(
      `
        UPDATE habitacion_imagenes
        SET
          archivo = ?,
          nombre_original = ?
        WHERE id = ?
          AND id_habitacion = ?
      `,
      [
        req.file.filename,
        req.file.originalname,
        req.params.imagenId,
        req.params.id
      ]
    );

    await fsp.unlink(
      path.join(
        habitacionesUploadsDir,
        path.basename(
          imagenActual.archivo
        )
      )
    ).catch(() => {});

    return res.json({
      message:
        'Imagen reemplazada correctamente.'
    });

  } catch (error) {

    if (req.file?.path) {
      await fsp.unlink(
        req.file.path
      ).catch(() => {});
    }

    next(error);

  }
}


/* =========================================================
   ELIMINAR UNA IMAGEN
========================================================= */

export async function eliminarImagenHabitacion(
  req,
  res,
  next
) {

  try {

    const rows =
      await query(
        `
          SELECT archivo
          FROM habitacion_imagenes
          WHERE id = ?
            AND id_habitacion = ?
          LIMIT 1
        `,
        [
          req.params.imagenId,
          req.params.id
        ]
      );

    if (!rows?.[0]) {

      return res.status(404).json({
        message:
          'Imagen no encontrada para esta habitación.'
      });

    }

    await query(
      `
        DELETE FROM habitacion_imagenes
        WHERE id = ?
          AND id_habitacion = ?
      `,
      [
        req.params.imagenId,
        req.params.id
      ]
    );

    await fsp.unlink(
      path.join(
        habitacionesUploadsDir,
        path.basename(
          rows[0].archivo
        )
      )
    ).catch(() => {});

    return res.json({
      message:
        'Imagen eliminada correctamente.'
    });

  } catch (error) {

    next(error);

  }
}


/* =========================================================
   SERVIR IMAGEN PÚBLICA DEL CATÁLOGO
========================================================= */

export async function servirImagenHabitacion(
  req,
  res,
  next
) {

  try {

    const filename =
      path.basename(
        req.params.filename
      );

    const rows =
      await query(
        `
          SELECT id
          FROM habitacion_imagenes
          WHERE archivo = ?
          LIMIT 1
        `,
        [filename]
      );

    if (!rows?.[0]) {

      return res.status(404).send(
        'Imagen no encontrada.'
      );

    }

    const filePath =
      path.join(
        habitacionesUploadsDir,
        filename
      );

    if (!fs.existsSync(filePath)) {

      return res.status(404).send(
        'Imagen no encontrada.'
      );

    }

    return res.sendFile(
      filePath
    );

  } catch (error) {

    next(error);

  }
}
