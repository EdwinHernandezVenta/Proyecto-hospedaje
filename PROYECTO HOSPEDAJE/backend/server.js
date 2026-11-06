import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import routes from './src/routes/index.js';
import { ensureApplicationSchema } from './src/config/db.js';
import {
  swaggerSpec
} from './src/config/swagger.js';

import {
  errorHandler
} from './src/middlewares/error.js';

import { securityHeaders } from './src/middlewares/security.js';

import {
  broadcast
} from './src/realtime/realtime.js';


dotenv.config();


/* =========================================================
   RUTAS DEL PROYECTO
========================================================= */

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


/*
  __dirname apunta directamente a:

  PROYECTO HOSPEDAJE/backend

  Por eso ../frontend/dist apunta siempre a:

  PROYECTO HOSPEDAJE/frontend/dist

  independientemente de desde dónde se ejecute Node.
*/

const frontendDist =
  path.resolve(
    __dirname,
    '../frontend/dist'
  );


const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',

  // Frontend servido directamente por el backend
  'http://localhost:4000',
  'http://127.0.0.1:4000',

  // Tailscale Funnel
  'https://paie.tail81601e.ts.net'
];

const corsOptions = {

  origin(
    origin,
    callback
  ) {

    /*
      Peticiones sin Origin.
    */

    if (!origin) {

      return callback(
        null,
        true
      );

    }


    /*
      Desarrollo local.
    */

    if (
      allowedOrigins.includes(origin)
    ) {

      return callback(
        null,
        true
      );

    }


    /*
      Cloudflare Tunnel permanente.

      Permitimos dominios *.trycloudflare.com
      para conservar compatibilidad con pruebas
      actuales.
    */

    if (
      /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(
        origin
      )
    ) {

      return callback(
        null,
        true
      );

    }


    /*
      Permitir un frontend de Cloudflare/producción
      configurado mediante CLIENT_URL.
    */

    if (
      process.env.CLIENT_URL &&
      origin === process.env.CLIENT_URL
    ) {

      return callback(
        null,
        true
      );

    }


    return callback(
      new Error(
        'Origen no permitido por CORS'
      )
    );

  },


  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],


  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ],


  credentials: true

};


app.use(securityHeaders);

app.use(
  cors(corsOptions)
);

app.use(
  express.json({ limit: '100kb' })
);


/* =========================================================
   UPLOADS
========================================================= */

const uploadsPath =
  path.resolve(
    __dirname,
    'uploads'
  );


fs.mkdirSync(
  uploadsPath,
  {
    recursive: true
  }
);


/* Los comprobantes se sirven mediante una ruta autenticada en la API. */


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  '/health',
  (req, res) => {

    res.json({
      ok: true,
      service: 'sistema-hospedaje',
      realtime: true
    });

  }
);


/* =========================================================
   EVENTOS DE TIEMPO REAL
========================================================= */

/*
  Interceptamos las respuestas exitosas de modificaciones
  de la API.

  De esta manera no necesitamos modificar uno por uno
  todos los controladores que ya funcionan.

  Cuando Admin o Cliente realiza:

  POST
  PUT
  PATCH
  DELETE

  el backend genera automáticamente un evento para los
  demás usuarios conectados.
*/

app.use(
  '/api/v1',
  (req, res, next) => {

    const method =
      String(
        req.method || ''
      ).toUpperCase();


    const methodsWithEvents = [
      'POST',
      'PUT',
      'PATCH',
      'DELETE'
    ];


    if (
      !methodsWithEvents.includes(method)
    ) {

      return next();

    }


    const originalJson =
      res.json.bind(res);


    res.json =
      (body) => {

        const response =
          originalJson(body);


        /*
          Solamente avisamos cuando la operación
          realmente fue exitosa.
        */

        if (
          res.statusCode >= 200 &&
          res.statusCode < 300
        ) {

          broadcast(
            'data_changed',
            {
              method,
              path: req.originalUrl,
              status: res.statusCode
            }
          );

        }


        return response;

      };


    next();

  }
);


/* =========================================================
   API
========================================================= */

app.use(
  '/api/v1',
  routes
);


/* =========================================================
   SWAGGER
========================================================= */

if (
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_API_DOCS === 'true'
) {

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(
      swaggerSpec
    )
  );

}


/* =========================================================
   FRONTEND EN PRODUCCIÓN
========================================================= */

if (
  process.env.NODE_ENV === 'production'
) {

  /*
    Comprobamos que exista el build antes de intentar
    servirlo.
  */

  if (
    !fs.existsSync(frontendDist)
  ) {

    console.error(
      `Frontend de producción no encontrado: ${frontendDist}`
    );

  } else {

    console.log(
      `Frontend de producción: ${frontendDist}`
    );

  }


  /*
    Servimos directamente los archivos generados
    por Vite.
  */

  app.use(
    express.static(
      frontendDist
    )
  );


  /*
    React necesita recibir index.html para las rutas
    que no corresponden a archivos ni a la API.
  */

  app.get(
    '*',
    (req, res, next) => {

      if (
        req.path.startsWith('/api/')
      ) {

        return next();

      }


      return res.sendFile(
        path.join(
          frontendDist,
          'index.html'
        )
      );

    }
  );

}


/* =========================================================
   MANEJO DE ERRORES
========================================================= */

app.use(
  errorHandler
);


/* =========================================================
   SERVIDOR
========================================================= */

const port =
  Number(
    process.env.PORT || 4000
  );


async function iniciarServidor() {
  try {
    await ensureApplicationSchema();

    app.listen(
      port,
      () => {
        console.log(
          `API http://localhost:${port}`
        );

        console.log(
          'Tiempo real SSE activo'
        );
      }
    );
  } catch (error) {
    console.error(
      'No fue posible preparar la base de datos antes de iniciar el servidor:',
      error
    );
    process.exit(1);
  }
}

iniciarServidor();