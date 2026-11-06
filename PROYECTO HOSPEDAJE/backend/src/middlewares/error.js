export function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;

  if (status >= 500) {
    return res.status(500).json({
      message:
        process.env.NODE_ENV === 'production'
          ? 'Error interno del servidor'
          : (err.message || 'Error interno del servidor')
    });
  }

  return res.status(status).json({
    message: err.message || 'Solicitud no válida'
  });
}
