import { query } from '../config/db.js';

export async function stats(req, res, next) {
  try {
    const [
      reservas,
      clientes,
      huespedes,
      ventas,
      mix,
      feedback
    ] = await Promise.all([
      query(
        "SELECT COUNT(*) total FROM reservas WHERE estado<>'cancelada'"
      ),

      query(
        'SELECT COUNT(*) total FROM clientes WHERE estado=1'
      ),

      query(
        'SELECT COUNT(*) total FROM huespedes'
      ),

      query(
        `SELECT
          DATE_FORMAT(MAX(p.fecha), '%d/%m/%Y') AS fecha,
          r.id AS id_reserva,
          r.numero_confirmacion,
          r.valor_total AS valor
        FROM pagos p
        INNER JOIN reservas r
          ON r.id = p.id_reserva
        WHERE p.estado = 'confirmado'
        GROUP BY
          r.id,
          r.numero_confirmacion,
          r.valor_total
        ORDER BY MAX(p.fecha)`
      ),

      query(
        'SELECT estado, COUNT(*) total FROM reservas GROUP BY estado'
      ),

      query(
        'SELECT ROUND(AVG(calificacion),2) promedio FROM encuestas_feedback'
      )
    ]);

    res.json({
      reservas: reservas[0].total,
      clientes: clientes[0].total,
      huespedes: huespedes[0].total,
      ventasMensuales: ventas,
      reservasPorEstado: mix,
      calificacionPromedio: feedback[0].promedio || 0
    });
  } catch (e) {
    next(e);
  }
}