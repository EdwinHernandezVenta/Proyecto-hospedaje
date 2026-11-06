import {query} from '../config/db.js';

export const safeTables=new Set([
  'roles','usuarios','habitaciones','servicios','paquetes','clientes','huespedes','encuestas_feedback'
]);

export const tableColumns={
  roles:new Set(['nombre_rol','permisos','estado_rol']),
  usuarios:new Set(['nombre_usuario','correo','contrasena','id_rol','estado']),
  habitaciones:new Set(['numero_habitacion','tipo_habitacion','capacidad_maxima','descripcion','comodidades','tarifa','notas','estado']),
  servicios:new Set(['nombre_servicio','descripcion','categoria','costo','disponibilidad','cantidad_disponible','observacion','estado']),
  paquetes:new Set(['nombre','descripcion','precio','servicios_incluidos','itinerario','tipo_viaje','disponibilidad','estado','destino','condiciones']),
  clientes:new Set(['identificacion','nombre','apellido','telefono','direccion','correo','estado']),
  huespedes:new Set(['documento','nombres','apellidos','fecha_nacimiento','correo','departamento','ciudad','direccion','celular','id_reserva','estado']),
  encuestas_feedback:new Set(['id_huesped','id_cliente','calificacion','comentario','anonimo'])
};

export async function list(table,{page=1,limit=10,search=''}={}){
  if(!safeTables.has(table))throw new Error('Tabla no permitida');
  const safeLimit=Math.min(Math.max(Number(limit)||10,1),100);
  const safePage=Math.max(Number(page)||1,1);
  const offset=(safePage-1)*safeLimit;
  const searchMap={
    roles:['nombre_rol'],usuarios:['nombre_usuario','correo'],
    habitaciones:['numero_habitacion','tipo_habitacion'],
    servicios:['nombre_servicio','categoria'],paquetes:['nombre','destino'],
    clientes:['nombre','apellido','correo'],huespedes:['nombres','apellidos','documento']
  };
  let clause='',p=[];
  const cols=searchMap[table]||[];
  if(search&&cols.length){
    clause=' WHERE '+cols.map(c=>`CAST(${c} AS CHAR) LIKE ?`).join(' OR ');
    p.push(...cols.map(()=>`%${search}%`));
  }
  let rows;

  if (table === 'habitaciones') {
    rows = await query(
      `
        SELECT
          h.*,
          COALESCE(
            (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', hi.id,
                  'archivo', hi.archivo,
                  'nombre_original', hi.nombre_original,
                  'orden', hi.orden
                )
              )
              FROM habitacion_imagenes hi
              WHERE hi.id_habitacion = h.id
            ),
            JSON_ARRAY()
          ) AS imagenes
        FROM habitaciones h
        ${clause.replaceAll('numero_habitacion','h.numero_habitacion').replaceAll('tipo_habitacion','h.tipo_habitacion')}
        ORDER BY h.id DESC
        LIMIT ? OFFSET ?
      `,
      [...p, safeLimit, offset]
    );
  } else if (table === 'servicios') {
    rows = await query(
      `
        SELECT
          s.id,
          s.nombre_servicio,
          s.descripcion,
          s.categoria,
          s.costo,
          s.disponibilidad,
          s.cantidad_disponible,
          s.observacion,
          s.estado,
          s.created_at,
          s.updated_at,
          COALESCE(
            (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', si.id,
                  'archivo', si.archivo,
                  'nombre_original', si.nombre_original,
                  'orden', si.orden
                )
              )
              FROM servicio_imagenes si
              WHERE si.id_servicio = s.id
            ),
            JSON_ARRAY()
          ) AS imagenes
        FROM servicios s
        ${clause.replaceAll('nombre_servicio','s.nombre_servicio').replaceAll('categoria','s.categoria')}
        ORDER BY s.id DESC
        LIMIT ? OFFSET ?
      `,
      [...p, safeLimit, offset]
    );
  } else if (table === 'paquetes') {
    rows = await query(
      `
        SELECT
          p.id,
          p.nombre,
          p.descripcion,
          p.precio,
          p.servicios_incluidos,
          p.itinerario,
          p.tipo_viaje,
          p.fecha_inicio,
          p.disponibilidad,
          p.estado,
          p.destino,
          p.condiciones,
          p.created_at,
          p.updated_at,
          COALESCE(
            (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', pi.id,
                  'archivo', pi.archivo,
                  'nombre_original', pi.nombre_original,
                  'orden', pi.orden
                )
              )
              FROM paquete_imagenes pi
              WHERE pi.id_paquete = p.id
            ),
            JSON_ARRAY()
          ) AS imagenes
        FROM paquetes p
        ${clause.replaceAll('nombre','p.nombre').replaceAll('destino','p.destino')}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
      `,
      [...p, safeLimit, offset]
    );
  } else {
    rows = await query(
      `SELECT * FROM ${table}${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...p, safeLimit, offset]
    );
  }

  const total =
    (await query(
      `SELECT COUNT(*) total FROM ${table}${clause}`,
      p
    ))[0].total;

  return {rows,total,page:safePage,limit:safeLimit};
}
