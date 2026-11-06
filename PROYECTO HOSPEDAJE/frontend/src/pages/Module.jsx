import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../components/AppDialog';
import PasswordInput from '../components/PasswordInput';
import HabitacionesCliente from '../components/HabitacionesCliente';
import ServiciosCliente from '../components/ServiciosCliente';
import PaquetesCliente from '../components/PaquetesCliente';

const fields = {
  roles: ['nombre_rol', 'permisos', 'estado_rol'],

  usuarios: [
    'nombre_usuario',
    'correo',
    'contrasena',
    'id_rol',
    'estado'
  ],

  habitaciones: [
    'numero_habitacion',
    'tipo_habitacion',
    'capacidad_maxima',
    'descripcion',
    'comodidades',
    'tarifa',
    'notas',
    'estado'
  ],

  servicios: [
    'nombre_servicio',
    'descripcion',
    'categoria',
    'costo',
    'disponibilidad',
    'cantidad_disponible',
    'observacion',
    'estado'
  ],

  paquetes: [
    'nombre',
    'descripcion',
    'precio',
    'servicios_incluidos',
    'itinerario',
    'tipo_viaje',
    'disponibilidad',
    'estado',
    'destino',
    'condiciones'
  ],

  clientes: [
    'identificacion',
    'nombre',
    'apellido',
    'telefono',
    'direccion',
    'correo',
    'estado'
  ],

  huespedes: [
    'documento',
    'nombres',
    'apellidos',
    'fecha_nacimiento',
    'correo',
    'departamento',
    'ciudad',
    'direccion',
    'celular',
    'id_reserva',
    'estado'
  ],

  feedback: [
    'id_cliente',
    'id_huesped',
    'calificacion',
    'comentario',
    'anonimo'
  ]
};

const labels = {
  numero_habitacion: 'Número',
  tipo_habitacion: 'Tipo de habitación',
  capacidad_maxima: 'Capacidad',
  nombre_servicio: 'Servicio',
  nombre_usuario: 'Usuario',
  id_rol: 'Rol',
  nombre: 'Nombre',
  id_cliente: 'ID Cliente',
  id_huesped: 'ID Huésped',
  id_reserva: 'ID Reserva',
  valor_total: 'Valor total',
  contrasena: 'Contraseña',
  correo: 'Correo electrónico',
  estado: 'Estado',
  disponibilidad: 'Disponibilidad',
  cantidad_disponible: 'Cantidad disponible',
  categoria: 'Categoría',
  costo: 'Costo',
  observacion: 'Observación',
  tarifa: 'Tarifa',
  notas: 'Notas',
  imagenes: 'Fotografías',
  created_at: 'Creado',
  updated_at: 'Actualizado',
  servicios_incluidos: 'Servicios incluidos',
  itinerario: 'Itinerario',
  tipo_viaje: 'Tipo de viaje',
  destino: 'Destino',
  condiciones: 'Condiciones'
};

const CLIENTE_CREAR = [
  'huespedes',
  'feedback'
];

const CLIENTE_EDITAR = [
  'huespedes',
  'feedback',
  'clientes'
];

const USER_COLUMNS = [
  'id',
  'nombre_usuario',
  'correo',
  'id_rol',
  'estado',
  'fecha_creacion'
];

const USER_LABELS = {
  id: 'ID',
  nombre_usuario: 'Usuario',
  correo: 'Correo',
  id_rol: 'Rol',
  estado: 'Estado',
  fecha_creacion: 'Fecha de creación'
};

function obtenerEtiquetaCampo(field) {
  return (
    labels[field] ||
    field
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letra) => letra.toUpperCase())
  );
}

function formatearFecha(valor) {
  if (!valor) {
    return '';
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return String(valor);
  }

  return fecha.toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

/*
 * =========================================================
 * IMÁGENES DE HABITACIONES
 * =========================================================
 */

function normalizarImagenesHabitacion(valor) {
  if (Array.isArray(valor)) {
    return valor;
  }

  if (!valor) {
    return [];
  }

  if (typeof valor === 'string') {
    try {
      const parseado = JSON.parse(valor);
      return Array.isArray(parseado)
        ? parseado
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function urlImagenHabitacion(archivo) {
  if (!archivo) {
    return '';
  }

  return `/api/v1/habitaciones/imagenes/${encodeURIComponent(
    archivo
  )}`;
}

/*
 * =========================================================
 * NORMALIZAR ESTADO DE HABITACIÓN
 * =========================================================
 */

function normalizarImagenesServicio(valor) {
  if (Array.isArray(valor)) return valor;
  if (!valor) return [];
  if (typeof valor === 'string') {
    try {
      const parseado = JSON.parse(valor);
      return Array.isArray(parseado) ? parseado : [];
    } catch {
      return [];
    }
  }
  return [];
}

function urlImagenServicio(archivo) {
  if (!archivo) return '';
  return `/api/v1/servicios/imagenes/${encodeURIComponent(archivo)}`;
}

function normalizarEstadoHabitacion(estado) {
  return String(estado ?? '')
    .trim()
    .toLowerCase();
}

/*
 * =========================================================
 * SABER SI UNA HABITACIÓN ESTÁ DISPONIBLE
 * =========================================================
 */

function habitacionDisponible(estado) {
  const estadoNormalizado =
    normalizarEstadoHabitacion(estado);

  return estadoNormalizado === 'disponible';
}

/*
 * =========================================================
 * SABER SI UNA HABITACIÓN SE PUEDE ELIMINAR
 *
 * Una habitación ocupada o relacionada con una reserva
 * no debe eliminarse desde la interfaz.
 * =========================================================
 */

function habitacionPuedeEliminarse(row) {
  const estado =
    normalizarEstadoHabitacion(row.estado);

  return estado !== 'ocupada';
}

/*
 * =========================================================
 * SERVICIOS
 *
 * En la base de datos disponibilidad y estado son enteros:
 * 1 = sí / activo
 * 0 = no / inactivo
 * =========================================================
 */

function valorActivo(valor) {
  return (
    valor === true ||
    valor === 1 ||
    String(valor ?? '').trim().toLowerCase() === '1' ||
    String(valor ?? '').trim().toLowerCase() === 'true' ||
    String(valor ?? '').trim().toLowerCase() === 'activo' ||
    String(valor ?? '').trim().toLowerCase() === 'disponible'
  );
}

function servicioDisponible(row) {
  return (
    valorActivo(row.disponibilidad) &&
    valorActivo(row.estado)
  );
}

function normalizarServicioDisponibilidad(valor) {
  return valorActivo(valor) ? 1 : 0;
}

function normalizarServicioEstado(valor) {
  return valorActivo(valor) ? 1 : 0;
}

export default function Module({ name }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { confirmDialog, notify } = useDialog();

  const [data, setData] = useState({
    rows: [],
    total: 0
  });

  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [rolesDisponibles, setRolesDisponibles] = useState([]);
  const [imagenesSeleccionadas, setImagenesSeleccionadas] = useState([]);
  const [imagenesHabitacion, setImagenesHabitacion] = useState([]);
  const [imagenesServicio, setImagenesServicio] = useState([]);
  const [imagenesPaquete, setImagenesPaquete] = useState([]);
  const [cargandoImagenes, setCargandoImagenes] = useState(false);
  const [catalogoHabitaciones, setCatalogoHabitaciones] = useState([]);
  const [catalogoServicios, setCatalogoServicios] = useState([]);
  const [habitacionesIncluidas, setHabitacionesIncluidas] = useState([]);
  const [serviciosIncluidosIds, setServiciosIncluidosIds] = useState([]);

  const fs = fields[name] || [];

  const esCliente =
    user?.rol === 'Cliente';

  const esAdministrador =
    user?.rol === 'Administrador';

  const puedeCrear =
    esAdministrador ||
    (esCliente &&
      CLIENTE_CREAR.includes(name));

  const puedeEditar =
    esAdministrador ||
    (esCliente &&
      CLIENTE_EDITAR.includes(name));

  const puedeEliminar =
    esAdministrador;

  /*
   * =========================================================
   * CARGAR ROLES
   * =========================================================
   */

  async function loadRoles() {
    if (
      name !== 'usuarios' ||
      !esAdministrador
    ) {
      setRolesDisponibles([]);
      return;
    }

    try {
      const response =
        await api.get('/roles');

      const roles =
        Array.isArray(response.data)
          ? response.data
          : [];

      setRolesDisponibles(
        roles.filter(
          (rol) =>
            rol.estado_rol === true ||
            rol.estado_rol === 1
        )
      );

    } catch (error) {
      setRolesDisponibles([]);

      setMsg(
        error.response?.data?.message ||
        'No se pudieron cargar los roles'
      );
    }
  }

  /*
   * =========================================================
   * CATÁLOGOS PARA PAQUETES
   *
   * Las relaciones se construyen con IDs reales. Si mañana
   * se crea una nueva habitación o servicio, aparece aquí
   * sin modificar el código.
   * =========================================================
   */

  async function cargarCatalogosPaquete() {
    if (name !== 'paquetes' || !esAdministrador) {
      setCatalogoHabitaciones([]);
      setCatalogoServicios([]);
      return;
    }

    async function cargarTodos(endpoint) {
      const limite = 100;
      const primeraRespuesta = await api.get(endpoint, {
        params: { limit: limite, page: 1 }
      });

      const primera = primeraRespuesta.data || {};
      const filasIniciales = Array.isArray(primera.rows)
        ? primera.rows
        : Array.isArray(primera)
          ? primera
          : [];

      const totalPaginas = Math.max(1, Number(primera.totalPages || 1));

      if (totalPaginas === 1) {
        return filasIniciales;
      }

      const paginasRestantes = await Promise.all(
        Array.from({ length: totalPaginas - 1 }, (_, indice) =>
          api.get(endpoint, {
            params: {
              limit: limite,
              page: indice + 2
            }
          })
        )
      );

      return [
        ...filasIniciales,
        ...paginasRestantes.flatMap((respuesta) =>
          Array.isArray(respuesta.data?.rows)
            ? respuesta.data.rows
            : []
        )
      ];
    }

    try {
      const [habitaciones, servicios] = await Promise.all([
        cargarTodos('/habitaciones'),
        cargarTodos('/servicios')
      ]);

      setCatalogoHabitaciones(habitaciones);
      setCatalogoServicios(servicios);
    } catch (error) {
      setCatalogoHabitaciones([]);
      setCatalogoServicios([]);
      setMsg(
        error.response?.data?.message ||
        'No se pudieron cargar las habitaciones y servicios para el paquete.'
      );
    }
  }

  useEffect(() => {
    cargarCatalogosPaquete();
  }, [name, esAdministrador]);

  /*
   * =========================================================
   * CARGAR REGISTROS
   * =========================================================
   */

  async function load() {
    setLoading(true);

    try {
      const response =
        await api.get(`/${name}`, {
          params: {
            search,
            limit: 50
          }
        });

      const respuesta =
        response.data || {
          rows: [],
          total: 0
        };

      /*
       * =====================================================
       * FILTRO PARA CLIENTES EN HABITACIONES
       *
       * El cliente solamente puede ver habitaciones
       * disponibles.
       * =====================================================
       */

      if (
        name === 'habitaciones' &&
        esCliente
      ) {
        const habitacionesDisponibles =
          Array.isArray(respuesta.rows)
            ? respuesta.rows.filter(
                (row) =>
                  habitacionDisponible(row.estado)
              )
            : [];

        setData({
          rows: habitacionesDisponibles,
          total: habitacionesDisponibles.length
        });

      } else if (
        name === 'servicios' &&
        esCliente
      ) {
        const serviciosDisponibles =
          Array.isArray(respuesta.rows)
            ? respuesta.rows.filter(
                servicioDisponible
              )
            : [];

        setData({
          rows: serviciosDisponibles,
          total: serviciosDisponibles.length
        });

      } else {
        setData(respuesta);
      }

      setMsg('');

    } catch (error) {
      setMsg(
        error.response?.data?.message ||
        'No se pudieron cargar los datos'
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setImagenesSeleccionadas([]);
    setImagenesHabitacion([]);
    setImagenesServicio([]);
    setImagenesPaquete([]);
    setHabitacionesIncluidas([]);
    setServiciosIncluidosIds([]);
    setForm({});

    if (name === 'habitaciones' && esCliente) {
      return;
    }

    load();
  }, [name, search, esCliente]);

  useEffect(() => {
    loadRoles();
  }, [name, esAdministrador]);

  /*
   * =========================================================
   * CAMBIAR CAMPO
   * =========================================================
   */

  function handleChange(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  /*
   * =========================================================
   * CARGAR IMÁGENES DE LA HABITACIÓN
   * =========================================================
   */

  async function cargarImagenesHabitacion(id) {
    if (!id) {
      setImagenesHabitacion([]);
      return;
    }

    setCargandoImagenes(true);

    try {
      const response =
        await api.get(`/habitaciones/${id}/imagenes`);

      const imagenes =
        Array.isArray(response.data?.imagenes)
          ? response.data.imagenes
          : [];

      setImagenesHabitacion(imagenes);
    } catch (error) {
      setImagenesHabitacion([]);
      setMsg(
        error.response?.data?.message ||
        'No se pudieron cargar las imágenes de la habitación.'
      );
    } finally {
      setCargandoImagenes(false);
    }
  }

  /*
   * =========================================================
   * SUBIR IMÁGENES
   * =========================================================
   */

  async function subirImagenesHabitacion(id, archivos) {
    if (
      name !== 'habitaciones' ||
      !id ||
      !archivos?.length
    ) {
      return;
    }

    const formData = new FormData();

    archivos.forEach((archivo) => {
      formData.append('imagenes', archivo);
    });

    await api.post(
      `/habitaciones/${id}/imagenes`,
      formData
    );

    await cargarImagenesHabitacion(id);
  }

  /*
   * =========================================================
   * REEMPLAZAR IMAGEN
   * =========================================================
   */

  async function reemplazarImagenHabitacion(
    idHabitacion,
    idImagen,
    archivo
  ) {
    if (!archivo) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('imagen', archivo);

      await api.put(
        `/habitaciones/${idHabitacion}/imagenes/${idImagen}`,
        formData
      );

      setMsg('Imagen reemplazada correctamente');
      await cargarImagenesHabitacion(idHabitacion);
      await load();
    } catch (error) {
      setMsg(
        error.response?.data?.message ||
        'No se pudo reemplazar la imagen.'
      );
    }
  }

  /*
   * =========================================================
   * ELIMINAR IMAGEN
   * =========================================================
   */

  async function eliminarImagenHabitacion(
    idHabitacion,
    idImagen
  ) {
    const confirmar = await confirmDialog(
      '¿Seguro que quieres eliminar esta imagen?',
      { title: 'Eliminar imagen', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'error' }
    );

    if (!confirmar) {
      return;
    }

    try {
      await api.delete(
        `/habitaciones/${idHabitacion}/imagenes/${idImagen}`
      );

      setMsg('Imagen eliminada correctamente');
      await cargarImagenesHabitacion(idHabitacion);
      await load();
    } catch (error) {
      setMsg(
        error.response?.data?.message ||
        'No se pudo eliminar la imagen.'
      );
    }
  }

  /*
   * =========================================================
   * IMÁGENES DE SERVICIOS
   * =========================================================
   */

  async function cargarImagenesServicio(id) {
    if (!id) { setImagenesServicio([]); return; }
    setCargandoImagenes(true);
    try {
      const response = await api.get(`/servicios/${id}/imagenes`);
      setImagenesServicio(Array.isArray(response.data?.imagenes) ? response.data.imagenes : []);
    } catch (error) {
      setImagenesServicio([]);
      setMsg(error.response?.data?.message || 'No se pudieron cargar las imágenes del servicio.');
    } finally {
      setCargandoImagenes(false);
    }
  }

  async function subirImagenesServicio(id, archivos) {
    if (name !== 'servicios' || !id || !archivos?.length) return;
    const formData = new FormData();
    archivos.forEach((archivo) => formData.append('imagenes', archivo));
    await api.post(`/servicios/${id}/imagenes`, formData);
    await cargarImagenesServicio(id);
  }

  async function reemplazarImagenServicio(idServicio, idImagen, archivo) {
    if (!archivo) return;
    try {
      const formData = new FormData();
      formData.append('imagen', archivo);
      await api.put(`/servicios/${idServicio}/imagenes/${idImagen}`, formData);
      setMsg('Imagen del servicio reemplazada correctamente');
      await cargarImagenesServicio(idServicio);
      await load();
    } catch (error) {
      setMsg(error.response?.data?.message || 'No se pudo reemplazar la imagen del servicio.');
    }
  }

  async function eliminarImagenServicio(idServicio, idImagen) {
    const confirmar = await confirmDialog(
      '¿Seguro que quieres eliminar esta imagen del servicio?',
      { title: 'Eliminar imagen', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'error' }
    );
    if (!confirmar) return;
    try {
      await api.delete(`/servicios/${idServicio}/imagenes/${idImagen}`);
      setMsg('Imagen del servicio eliminada correctamente');
      await cargarImagenesServicio(idServicio);
      await load();
    } catch (error) {
      setMsg(error.response?.data?.message || 'No se pudo eliminar la imagen del servicio.');
    }
  }

  /*
   * =========================================================
   * IMÁGENES DE PAQUETES
   * =========================================================
   */

  async function cargarImagenesPaquete(id) {
    if (!id) {
      setImagenesPaquete([]);
      return;
    }

    setCargandoImagenes(true);

    try {
      const response = await api.get(`/paquetes/${id}/imagenes`);
      setImagenesPaquete(Array.isArray(response.data?.imagenes) ? response.data.imagenes : []);
    } catch (error) {
      setImagenesPaquete([]);
      setMsg(error.response?.data?.message || 'No se pudieron cargar las imágenes del paquete.');
    } finally {
      setCargandoImagenes(false);
    }
  }

  async function subirImagenesPaquete(id, archivos) {
    if (name !== 'paquetes' || !id || !archivos?.length) return;
    const formData = new FormData();
    archivos.forEach((archivo) => formData.append('imagenes', archivo));
    await api.post(`/paquetes/${id}/imagenes`, formData);
    await cargarImagenesPaquete(id);
  }

  async function reemplazarImagenPaquete(idPaquete, idImagen, archivo) {
    if (!archivo) return;
    try {
      const formData = new FormData();
      formData.append('imagen', archivo);
      await api.put(`/paquetes/${idPaquete}/imagenes/${idImagen}`, formData);
      setMsg('Imagen del paquete reemplazada correctamente');
      await cargarImagenesPaquete(idPaquete);
      await load();
    } catch (error) {
      setMsg(error.response?.data?.message || 'No se pudo reemplazar la imagen del paquete.');
    }
  }

  async function eliminarImagenPaquete(idPaquete, idImagen) {
    const confirmar = await confirmDialog(
      '¿Seguro que quieres eliminar esta imagen del paquete?',
      { title: 'Eliminar imagen', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'error' }
    );
    if (!confirmar) return;

    try {
      await api.delete(`/paquetes/${idPaquete}/imagenes/${idImagen}`);
      setMsg('Imagen del paquete eliminada correctamente');
      await cargarImagenesPaquete(idPaquete);
      await load();
    } catch (error) {
      setMsg(error.response?.data?.message || 'No se pudo eliminar la imagen del paquete.');
    }
  }

  /*
   * =========================================================
   * CREAR
   * =========================================================
   */

  async function save(event) {
    event.preventDefault();

    if (!puedeCrear) {
      setMsg(
        'No tienes permiso para crear registros en este módulo.'
      );
      return;
    }

    if (
      name === 'usuarios' &&
      !form.contrasena
    ) {
      setMsg(
        'La contraseña es obligatoria para crear un usuario.'
      );
      return;
    }

    if (
      name === 'usuarios' &&
      !form.id_rol
    ) {
      setMsg(
        'Debes seleccionar un rol para el usuario.'
      );
      return;
    }

    if (name === 'usuarios') {
      const password = String(form.contrasena || '');
      if (password.length < 8) { setMsg('La contraseña debe tener mínimo 8 caracteres.'); return; }
      if (!/[A-Z]/.test(password)) { setMsg('La contraseña debe contener al menos una mayúscula.'); return; }
      if (!/[a-z]/.test(password)) { setMsg('La contraseña debe contener al menos una minúscula.'); return; }
      if (!/[0-9]/.test(password)) { setMsg('La contraseña debe contener al menos un número.'); return; }
    }

    try {
      const datos = {
        ...form
      };

      if (name === 'paquetes' && esAdministrador) {
        datos.habitaciones_incluidas = habitacionesIncluidas.map((item) => ({
          id: Number(item.id),
          cantidad: Math.max(1, Number(item.cantidad || 1))
        }));

        datos.servicios_incluidos_ids = serviciosIncluidosIds.map((item) => ({
          id: Number(item.id),
          cantidad: Math.max(1, Number(item.cantidad || 1))
        }));

        if (!String(datos.servicios_incluidos ?? '').trim()) {
          const nombresHabitaciones = habitacionesIncluidas
            .map((item) => catalogoHabitaciones.find((habitacion) => Number(habitacion.id) === Number(item.id)))
            .filter(Boolean)
            .map((habitacion) => `Habitación ${habitacion.numero_habitacion}`);

          const nombresServicios = serviciosIncluidosIds
            .map((item) => catalogoServicios.find((servicio) => Number(servicio.id) === Number(item.id)))
            .filter(Boolean)
            .map((servicio) => servicio.nombre_servicio);

          const inclusionesGeneradas = [...nombresHabitaciones, ...nombresServicios];
          if (inclusionesGeneradas.length) {
            datos.servicios_incluidos = inclusionesGeneradas.join(', ');
          }
        }
      }

      if (name === 'servicios') {
        datos.disponibilidad =
          normalizarServicioDisponibilidad(
            datos.disponibilidad ?? 1
          );

        datos.cantidad_disponible = Math.max(
          0,
          Math.floor(Number(datos.cantidad_disponible ?? 1))
        );

        datos.estado =
          normalizarServicioEstado(
            datos.estado ?? 1
          );
      }

      const response =
        await api.post(
          `/${name}`,
          datos
        );

      const nuevoId =
        response.data?.id;

      if (name === 'habitaciones' && nuevoId && imagenesSeleccionadas.length) {
        await subirImagenesHabitacion(nuevoId, imagenesSeleccionadas);
      }

      if (name === 'servicios' && nuevoId && imagenesSeleccionadas.length) {
        await subirImagenesServicio(nuevoId, imagenesSeleccionadas);
      }

      if (name === 'paquetes' && nuevoId && imagenesSeleccionadas.length) {
        await subirImagenesPaquete(nuevoId, imagenesSeleccionadas);
      }

      setForm({});
      setHabitacionesIncluidas([]);
      setServiciosIncluidosIds([]);
      setImagenesSeleccionadas([]);
      setImagenesHabitacion([]);
      setImagenesServicio([]);
      setImagenesPaquete([]);

      setMsg(
        'Registro creado correctamente'
      );

      await load();

    } catch (error) {
      setMsg(
        error.response?.data?.message ||
        'Error al guardar'
      );
    }
  }

  /*
   * =========================================================
   * PREPARAR EDICIÓN
   * =========================================================
   */

  async function edit(row) {
    if (!puedeEditar) {
      setMsg(
        'No tienes permiso para editar este módulo.'
      );
      return;
    }

    const editable = {
      id: row.id
    };

    fs.forEach((field) => {
      if (
        row[field] !== undefined &&
        row[field] !== null
      ) {
        editable[field] =
          row[field];
      }
    });

    /*
     * La contraseña nunca se recupera.
     */

    if (name === 'usuarios') {
      editable.contrasena = '';
    }

    if (name === 'paquetes') {
      try {
        const response = await api.get(`/paquetes/${row.id}`);
        const paquete = response.data || row;
        let componentes = paquete.componentes_relacionados;
        if (typeof componentes === 'string') {
          try {
            componentes = JSON.parse(componentes);
          } catch {
            componentes = [];
          }
        }
        componentes = Array.isArray(componentes) ? componentes : [];

        setForm({
          ...editable,
          ...fs.reduce((acumulado, field) => {
            if (paquete[field] !== undefined && paquete[field] !== null) {
              acumulado[field] = paquete[field];
            }
            return acumulado;
          }, {})
        });

        setHabitacionesIncluidas(
          componentes
            .filter((item) => item?.id_habitacion !== null && item?.id_habitacion !== undefined)
            .map((item) => ({
              id: Number(item.id_habitacion),
              cantidad: Math.max(1, Number(item.cantidad || 1))
            }))
        );

        setServiciosIncluidosIds(
          componentes
            .filter((item) => item?.id_servicio !== null && item?.id_servicio !== undefined)
            .map((item) => ({
              id: Number(item.id_servicio),
              cantidad: Math.max(1, Number(item.cantidad || 1))
            }))
        );
      } catch (error) {
        setForm(editable);
        setHabitacionesIncluidas([]);
        setServiciosIncluidosIds([]);
        setMsg(
          error.response?.data?.message ||
          'No se pudieron cargar las relaciones del paquete.'
        );
      }
    } else {
      setForm(editable);
      setHabitacionesIncluidas([]);
      setServiciosIncluidosIds([]);
    }

    setImagenesSeleccionadas([]);

    if (name === 'habitaciones') {
      cargarImagenesHabitacion(row.id);
      setImagenesServicio([]);
    } else if (name === 'servicios') {
      cargarImagenesServicio(row.id);
      setImagenesHabitacion([]);
      setImagenesPaquete([]);
    } else if (name === 'paquetes') {
      cargarImagenesPaquete(row.id);
      setImagenesHabitacion([]);
      setImagenesServicio([]);
    } else {
      setImagenesHabitacion([]);
      setImagenesServicio([]);
      setImagenesPaquete([]);
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    setMsg(
      `Editando registro #${row.id}`
    );
  }

  /*
   * =========================================================
   * ACTUALIZAR
   * =========================================================
   */

  async function update(event) {
    event.preventDefault();

    if (!puedeEditar) {
      setMsg(
        'No tienes permiso para editar registros.'
      );
      return;
    }

    if (!form.id) {
      setMsg(
        'Selecciona primero un registro para editar.'
      );
      return;
    }

    if (name === 'usuarios' && form.contrasena) {
      const password = String(form.contrasena);
      if (password.length < 8) { setMsg('La contraseña debe tener mínimo 8 caracteres.'); return; }
      if (!/[A-Z]/.test(password)) { setMsg('La contraseña debe contener al menos una mayúscula.'); return; }
      if (!/[a-z]/.test(password)) { setMsg('La contraseña debe contener al menos una minúscula.'); return; }
      if (!/[0-9]/.test(password)) { setMsg('La contraseña debe contener al menos un número.'); return; }
    }

    try {
      const {
        id,
        ...datos
      } = form;

      /*
       * Si la contraseña está vacía,
       * se conserva la contraseña actual.
       */

      if (
        name === 'usuarios' &&
        !datos.contrasena
      ) {
        delete datos.contrasena;
      }

      if (name === 'servicios') {
        datos.disponibilidad =
          normalizarServicioDisponibilidad(
            datos.disponibilidad ?? 1
          );

        datos.cantidad_disponible = Math.max(
          0,
          Math.floor(Number(datos.cantidad_disponible ?? 1))
        );

        datos.estado =
          normalizarServicioEstado(
            datos.estado ?? 1
          );
      }

      await api.put(
        `/${name}/${id}`,
        datos
      );

      if (name === 'habitaciones' && imagenesSeleccionadas.length) {
        await subirImagenesHabitacion(id, imagenesSeleccionadas);
      }

      if (name === 'servicios' && imagenesSeleccionadas.length) {
        await subirImagenesServicio(id, imagenesSeleccionadas);
      }

      if (name === 'paquetes' && imagenesSeleccionadas.length) {
        await subirImagenesPaquete(id, imagenesSeleccionadas);
      }

      setForm({});
      setImagenesSeleccionadas([]);
      setImagenesHabitacion([]);
      setImagenesServicio([]);
      setImagenesPaquete([]);

      setMsg(
        'Registro actualizado correctamente'
      );

      await load();

    } catch (error) {
      setMsg(
        error.response?.data?.message ||
        'No se pudo actualizar el registro'
      );
    }
  }

  /*
   * =========================================================
   * CANCELAR EDICIÓN
   * =========================================================
   */

  function cancelarEdicion() {
    setForm({});
    setHabitacionesIncluidas([]);
    setServiciosIncluidosIds([]);
    setImagenesSeleccionadas([]);
    setImagenesHabitacion([]);
    setImagenesServicio([]);
    setImagenesPaquete([]);
    setMsg('');
  }

  /*
   * =========================================================
   * ELIMINAR
   * =========================================================
   */

  async function del(id, row = null) {
    if (!puedeEliminar) {
      setMsg(
        'No tienes permiso para eliminar registros.'
      );
      return;
    }

    /*
     * =====================================================
     * HABITACIONES
     *
     * Si está ocupada, no permitimos intentar eliminarla.
     * =====================================================
     */

    if (
      name === 'habitaciones' &&
      row &&
      !habitacionPuedeEliminarse(row)
    ) {
      setMsg(
        'Esta habitación está ocupada y no puede eliminarse. Puedes editarla si necesitas cambiar su estado.'
      );
      return;
    }

    const esCuentaUsuario = name === 'usuarios';

    const confirmar = await confirmDialog(
      esCuentaUsuario
        ? '¿Seguro que quieres eliminar esta cuenta? La cuenta quedará desactivada y el correo no podrá volver a registrarse.'
        : '¿Seguro que quieres eliminar este registro?',
      {
        title: esCuentaUsuario ? 'Eliminar cuenta' : 'Eliminar registro',
        type: 'error',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    );

    if (!confirmar) {
      return;
    }

    try {
      await api.delete(
        `/${name}/${id}`
      );

      if (name === 'habitaciones' || name === 'servicios' || name === 'paquetes') {
        setImagenesSeleccionadas([]);
        setImagenesHabitacion([]);
        setImagenesServicio([]);
      }

      if (
        name === 'usuarios' &&
        Number(id) === Number(user?.id)
      ) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        navigate('/', { replace: true });
        return;
      }

      setMsg(
        name === 'usuarios'
          ? 'Cuenta eliminada correctamente'
          : 'Registro eliminado correctamente'
      );

      await load();

    } catch (error) {
      /*
       * =====================================================
       * ERROR DE CLAVE FORÁNEA
       * =====================================================
       */

      const mensaje =
        error.response?.data?.message ||
        '';

      if (
        mensaje.toLowerCase().includes(
          'foreign key'
        ) ||
        mensaje.toLowerCase().includes(
          'foreign key constraint'
        ) ||
        mensaje.toLowerCase().includes(
          'cannot delete'
        ) ||
        mensaje.toLowerCase().includes(
          'cannot delete or update'
        )
      ) {
        setMsg(
          'No se puede eliminar este registro porque está relacionado con otros datos del sistema. Puedes editarlo o cambiar su estado.'
        );
        return;
      }

      setMsg(
        mensaje ||
        'No se pudo eliminar'
      );
    }
  }

  async function eliminarMiCuenta() {
    const confirmar = await confirmDialog(
      'Esta acción cerrará tu sesión y desactivará tu cuenta. No podrás volver a crear otra cuenta con el mismo correo. ¿Deseas continuar?',
      { title: 'Eliminar mi cuenta', confirmText: 'Eliminar cuenta', cancelText: 'Cancelar', type: 'error' }
    );

    if (!confirmar) return;

    try {
      await api.delete('/auth/account');
    } catch (error) {
      setMsg(error.response?.data?.message || 'No fue posible eliminar la cuenta.');
      return;
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/', { replace: true });
  }


  /*
   * =========================================================
   * TÍTULO
   * =========================================================
   */

  const title =
    esCliente && name === 'clientes'
      ? 'Mi perfil'
      : name === 'huespedes'
        ? 'Huéspedes'
        : name === 'feedback'
          ? 'Feedback'
          : name.charAt(0).toUpperCase() +
            name.slice(1);

  /*
   * =========================================================
   * COLUMNAS
   * =========================================================
   */

  const columns = useMemo(() => {
    if (name === 'usuarios') {
      return USER_COLUMNS;
    }

    if (name === 'habitaciones' || name === 'servicios' || name === 'paquetes') {
      const columnas = data.rows?.[0] ? Object.keys(data.rows[0]) : fs;
      const ocultas = name === 'servicios'
        ? new Set(['historial_cambios'])
        : name === 'paquetes'
          ? new Set(['fecha_inicio', 'fecha_fin'])
          : new Set();
      const visibles = columnas.filter((columna) => !ocultas.has(columna));
      return visibles.includes('imagenes') ? visibles : [...visibles, 'imagenes'];
    }

    return data.rows?.[0]
      ? Object.keys(data.rows[0])
      : fs;
  }, [
    name,
    data.rows,
    fs
  ]);

  const editando =
    Boolean(form.id);

  /*
   * =========================================================
   * CAMPO DE USUARIO
   * =========================================================
   */

  function renderUserField(field) {

    if (field === 'nombre_usuario') {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            Usuario
          </label>

          <input
            type="text"
            placeholder="Nombre de usuario"
            value={
              form.nombre_usuario ?? ''
            }
            onChange={(event) =>
              handleChange(
                'nombre_usuario',
                event.target.value
              )
            }
            required
          />
        </div>
      );
    }

    if (field === 'correo') {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            Correo electrónico
          </label>

          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={
              form.correo ?? ''
            }
            onChange={(event) =>
              handleChange(
                'correo',
                event.target.value
              )
            }
            required
          />
        </div>
      );
    }

    if (field === 'contrasena') {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            Contraseña
          </label>

          <PasswordInput
            placeholder={
              editando
                ? 'Dejar vacío para conservar la actual'
                : 'Contraseña'
            }
            value={form.contrasena ?? ''}
            onChange={(event) =>
              handleChange('contrasena', event.target.value)
            }
            required={!editando}
            autoComplete="new-password"
          />

        </div>
      );
    }

    if (field === 'id_rol') {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            Rol
          </label>

          <select
            className="pr-role-select"
            value={
              form.id_rol ?? ''
            }
            onChange={(event) =>
              handleChange(
                'id_rol',
                event.target.value
              )
            }
            required
          >
            <option value="">
              Seleccionar rol
            </option>

            {rolesDisponibles.map(
              (rol) => (
                <option
                  key={rol.id}
                  value={rol.id}
                >
                  {rol.nombre_rol}
                </option>
              )
            )}
          </select>
        </div>
      );
    }

    if (field === 'estado') {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            Estado
          </label>

          <select
            value={
              form.estado ?? 'activo'
            }
            disabled={esCliente && name === 'clientes'}
            onChange={(event) =>
              handleChange(
                'estado',
                event.target.value
              )
            }
          >
            <option value="activo">
              Activo
            </option>

            <option value="inactivo">
              Inactivo
            </option>
          </select>
        </div>
      );
    }

    return null;
  }

  /*
   * =========================================================
   * CELDA DE USUARIO
   * =========================================================
   */

  function renderUserCell(
    row,
    column
  ) {
    if (column === 'id') {
      return row.id;
    }

    if (
      column === 'nombre_usuario'
    ) {
      return row.nombre_usuario || '';
    }

    if (column === 'correo') {
      return row.correo || '';
    }

    if (column === 'id_rol') {
      const rol =
        rolesDisponibles.find(
          (item) =>
            Number(item.id) ===
            Number(row.id_rol)
        );

      return (
        rol?.nombre_rol ||
        `Rol #${row.id_rol ?? ''}`
      );
    }

    if (column === 'estado') {
      const activo =
        row.estado === 'activo' ||
        row.estado === 1 ||
        row.estado === true ||
        row.estado === '1';

      return (
        <span
          className={`module-status ${
            activo
              ? 'module-status-ok'
              : 'module-status-danger'
          }`}
        >
          {activo
            ? 'Activo'
            : 'Inactivo'}
        </span>
      );
    }

    if (
      column === 'fecha_creacion'
    ) {
      return formatearFecha(
        row.fecha_creacion
      );
    }

    return '';
  }

  /*
   * =========================================================
   * CAMPO GENÉRICO
   * =========================================================
   */

  function renderGenericField(field) {

    const isTextarea =
      [
        'descripcion',
        'comodidades',
        'observacion',
        'condiciones',
        'comentario',
        'direccion',
        'notas'
      ].includes(field);

    const isNumber =
      [
        'capacidad_maxima',
        'tarifa',
        'costo',
        'precio',
        'id_cliente',
        'id_huesped',
        'id_reserva',
        'calificacion'
      ].includes(field);

    const isDate =
      field === 'fecha_nacimiento';

    const isBoolean =
      field === 'anonimo';

    /*
     * =====================================================
     * TIPO DE HABITACIÓN
     * =====================================================
     */

    if (
      name === 'habitaciones' &&
      field === 'tipo_habitacion'
    ) {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            Tipo de habitación
          </label>

          <input
            type="text"
            value={form.tipo_habitacion ?? ''}
            onChange={(event) =>
              handleChange(
                field,
                event.target.value
              )
            }
            placeholder="Ejemplo: Individual, Doble, Suite, Familiar..."
            maxLength={80}
            required
          />

        </div>
      );
    }

    /*
     * =====================================================
     * ESTADO DE HABITACIÓN
     * =====================================================
     */

    if (
      name === 'habitaciones' &&
      field === 'estado'
    ) {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            Estado
          </label>

          <select
            value={
              form.estado ??
              'disponible'
            }
            onChange={(event) =>
              handleChange(
                field,
                event.target.value
              )
            }
          >
            <option value="disponible">
              Disponible
            </option>

            <option value="ocupada">
              Ocupada
            </option>

            <option value="inhabilitada">
              Inhabilitada
            </option>
          </select>
        </div>
      );
    }

    /*
     * =====================================================
     * CANTIDAD DISPONIBLE DEL SERVICIO
     * =====================================================
     */

    if (
      name === 'servicios' &&
      field === 'cantidad_disponible'
    ) {
      return (
        <div className="field" key={field}>
          <label>Cantidad disponible</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.cantidad_disponible ?? 1}
            onChange={(event) => handleChange(field, Math.max(0, Number(event.target.value || 0)))}
          />
        </div>
      );
    }

    /*
     * =====================================================
     * DISPONIBILIDAD DEL SERVICIO
     * =====================================================
     */

    if (
      name === 'servicios' &&
      field === 'disponibilidad'
    ) {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            Disponibilidad
          </label>

          <select
            value={
              normalizarServicioDisponibilidad(
                form.disponibilidad ?? 1
              )
            }
            onChange={(event) =>
              handleChange(
                field,
                Number(event.target.value)
              )
            }
          >
            <option value={1}>
              Disponible
            </option>

            <option value={0}>
              No disponible
            </option>
          </select>
        </div>
      );
    }

    /*
     * =====================================================
     * ESTADO DEL SERVICIO
     * =====================================================
     */

    if (
      name === 'servicios' &&
      field === 'estado'
    ) {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            Estado
          </label>

          <select
            value={
              normalizarServicioEstado(
                form.estado ?? 1
              )
            }
            onChange={(event) =>
              handleChange(
                field,
                Number(event.target.value)
              )
            }
          >
            <option value={1}>
              Activo
            </option>

            <option value={0}>
              Inactivo
            </option>
          </select>
        </div>
      );
    }

    if (name === 'clientes' && field === 'estado') {
      return (
        <div className="field" key={field}>
          <label>Estado</label>
          <select
            value={form.estado === true || form.estado === 1 || String(form.estado ?? '').trim().toLowerCase() === 'activo' ? '1' : '0'}
            disabled={esCliente}
            onChange={(event) => handleChange(field, Number(event.target.value))}
          >
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </select>
        </div>
      );
    }

    if (name === 'paquetes' && field === 'disponibilidad') {
      return (
        <div className="field" key={field}>
          <label>Disponibilidad</label>
          <select
            value={valorActivo(form.disponibilidad ?? 1) ? '1' : '0'}
            onChange={(event) => handleChange(field, Number(event.target.value))}
          >
            <option value="1">Disponible</option>
            <option value="0">No disponible</option>
          </select>
        </div>
      );
    }

    if (name === 'paquetes' && field === 'estado') {
      return (
        <div className="field" key={field}>
          <label>Estado</label>
          <select
            value={String(form.estado ?? 'activo').trim().toLowerCase().replaceAll(' ', '_')}
            onChange={(event) => handleChange(field, event.target.value)}
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="agotado">Agotado</option>
            <option value="en_promocion">En promoción</option>
          </select>
        </div>
      );
    }

    if (name === 'paquetes' && field === 'servicios_incluidos') {
      return (
        <div className="field" key={field}>
          <label>Servicios incluidos</label>
          <textarea
            value={form[field] ?? ''}
            onChange={(event) => handleChange(field, event.target.value)}
            placeholder="Ejemplo: Desayuno, spa, transporte..."
            rows={4}
          />
        </div>
      );
    }

    /*
     * =====================================================
     * TEXTAREA
     * =====================================================
     */

    if (isTextarea) {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            {obtenerEtiquetaCampo(field)}
          </label>

          <textarea
            placeholder={
              obtenerEtiquetaCampo(field)
            }
            value={
              form[field] ?? ''
            }
            onChange={(event) =>
              handleChange(
                field,
                event.target.value
              )
            }
            rows={4}
          />
        </div>
      );
    }

    /*
     * =====================================================
     * BOOLEANO
     * =====================================================
     */

    if (isBoolean) {
      return (
        <div
          className="field"
          key={field}
        >
          <label>
            {obtenerEtiquetaCampo(field)}
          </label>

          <select
            value={
              form[field] === true ||
              form[field] === 1 ||
              form[field] === '1'
                ? '1'
                : '0'
            }
            onChange={(event) =>
              handleChange(
                field,
                event.target.value
              )
            }
          >
            <option value="0">
              No
            </option>

            <option value="1">
              Sí
            </option>
          </select>
        </div>
      );
    }

    /*
     * =====================================================
     * CAMPO NORMAL
     * =====================================================
     */

    return (
      <div
        className="field"
        key={field}
      >
        <label>
          {obtenerEtiquetaCampo(field)}
        </label>

        <input
          readOnly={
            esCliente &&
            name === 'clientes' &&
            ['identificacion', 'correo'].includes(field)
          }
          type={
            isDate
              ? 'date'
              : isNumber
                ? 'number'
                : 'text'
          }
          placeholder={
            obtenerEtiquetaCampo(field)
          }
          value={
            form[field] ?? ''
          }
          onChange={(event) =>
            handleChange(
              field,
              event.target.value
            )
          }
        />
      </div>
    );
  }

  /*
   * =========================================================
   * CELDA GENÉRICA
   * =========================================================
   */

  function renderGenericCell(row, column) {
    if (name === 'servicios' && column === 'imagenes') {
      const imagenes = normalizarImagenesServicio(row.imagenes);
      if (!imagenes.length) return <span style={{ fontSize: '12px', opacity: 0.65 }}>Sin fotografías</span>;
      return (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', minWidth: '180px' }}>
          {imagenes.slice(0, 4).map((imagen) => (
            <img key={imagen.id} src={urlImagenServicio(imagen.archivo)} alt={imagen.nombre_original || 'Fotografía de servicio'} style={{ width: '58px', height: '45px', objectFit: 'cover', borderRadius: '7px', border: '1px solid rgba(148, 163, 184, 0.25)' }} />
          ))}
          {imagenes.length > 4 && <span style={{ fontSize: '12px', alignSelf: 'center' }}>+{imagenes.length - 4}</span>}
        </div>
      );
    }

    if (name === 'paquetes' && column === 'imagenes') {
      const imagenes = normalizarImagenesServicio(row.imagenes);
      if (!imagenes.length) return <span style={{ fontSize: '12px', opacity: 0.65 }}>Sin fotografías</span>;
      return (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', minWidth: '180px' }}>
          {imagenes.slice(0, 4).map((imagen) => (
            <img key={imagen.id} src={`/api/v1/paquetes/imagenes/${encodeURIComponent(imagen.archivo)}`} alt={imagen.nombre_original || 'Fotografía de paquete'} style={{ width: '58px', height: '45px', objectFit: 'cover', borderRadius: '7px', border: '1px solid rgba(148, 163, 184, 0.25)' }} />
          ))}
          {imagenes.length > 4 && <span style={{ fontSize: '12px', alignSelf: 'center' }}>+{imagenes.length - 4}</span>}
        </div>
      );
    }

    if (name === 'paquetes' && column === 'disponibilidad') {
      return <span className={`module-status ${valorActivo(row.disponibilidad) ? 'module-status-ok' : 'module-status-muted'}`}>{valorActivo(row.disponibilidad) ? 'Disponible' : 'No disponible'}</span>;
    }

    if (name === 'paquetes' && column === 'estado') {
      const estado = String(row.estado ?? '').trim().toLowerCase();
      const mapa = { activo: ['Activo', 'module-status-ok'], inactivo: ['Inactivo', 'module-status-danger'], agotado: ['Agotado', 'module-status-warning'], en_promocion: ['En promoción', 'module-status-ok'], 'en promoción': ['En promoción', 'module-status-ok'] };
      const [texto, clase] = mapa[estado] || [row.estado || 'Sin estado', 'module-status-muted'];
      return <span className={`module-status ${clase}`}>{texto}</span>;
    }

    if (
      name === 'servicios' &&
      column === 'cantidad_disponible'
    ) {
      const cantidad = Math.max(0, Number(row.cantidad_disponible ?? 0));
      return (
        <span className={`module-status ${cantidad > 0 ? 'module-status-ok' : 'module-status-warning'}`}>
          {cantidad}
        </span>
      );
    }

    if (
      name === 'servicios' &&
      column === 'disponibilidad'
    ) {
      const disponible =
        valorActivo(
          row.disponibilidad
        );

      return (
        <span
          className={`module-status ${
            disponible
              ? 'module-status-ok'
              : 'module-status-muted'
          }`}
        >
          {disponible
            ? 'Disponible'
            : 'No disponible'}
        </span>
      );
    }

    if (
      name === 'servicios' &&
      column === 'estado'
    ) {
      const activo =
        valorActivo(row.estado);

      return (
        <span
          className={`module-status ${
            activo
              ? 'module-status-ok'
              : 'module-status-danger'
          }`}
        >
          {activo
            ? 'Activo'
            : 'Inactivo'}
        </span>
      );
    }

    if (
      name === 'habitaciones' &&
      column === 'imagenes'
    ) {
      const imagenes =
        normalizarImagenesHabitacion(
          row.imagenes
        );

      if (!imagenes.length) {
        return (
          <span
            style={{
              fontSize: '12px',
              opacity: 0.65
            }}
          >
            Sin fotografías
          </span>
        );
      }

      return (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            minWidth: '180px'
          }}
        >
          {imagenes.slice(0, 4).map((imagen) => (
            <img
              key={imagen.id}
              src={urlImagenHabitacion(imagen.archivo)}
              alt={
                imagen.nombre_original ||
                'Fotografía de habitación'
              }
              style={{
                width: '58px',
                height: '45px',
                objectFit: 'cover',
                borderRadius: '7px',
                border: '1px solid rgba(148, 163, 184, 0.25)'
              }}
            />
          ))}

          {imagenes.length > 4 && (
            <span
              style={{
                fontSize: '12px',
                alignSelf: 'center'
              }}
            >
              +{imagenes.length - 4}
            </span>
          )}
        </div>
      );
    }

    if (name === 'clientes' && column === 'estado') {
      const activo = row.estado === true || row.estado === 1 || String(row.estado ?? '').trim().toLowerCase() === '1' || String(row.estado ?? '').trim().toLowerCase() === 'activo';
      return (
        <span className={`module-status ${activo ? 'module-status-ok' : 'module-status-danger'}`}>
          {activo ? 'Activo' : 'Inactivo'}
        </span>
      );
    }

    if (
      name === 'habitaciones' &&
      column === 'estado'
    ) {
      const estado =
        normalizarEstadoHabitacion(
          row.estado
        );

      let clase =
        'module-status-muted';

      if (estado === 'disponible') {
        clase =
          'module-status-ok';
      }

      if (estado === 'ocupada') {
        clase =
          'module-status-warning';
      }

      if (estado === 'inhabilitada') {
        clase =
          'module-status-danger';
      }

      return (
        <span
          className={`module-status ${clase}`}
        >
          {row.estado || 'Sin estado'}
        </span>
      );
    }

    return String(
      row[column] ?? ''
    );
  }

  /*
   * =========================================================
   * VISTA DE HABITACIONES PARA CLIENTES
   *
   * La administración conserva la tabla y el formulario
   * existentes. Solo el cliente recibe el catalogo visual.
   * =========================================================
   */
  if (name === 'habitaciones' && esCliente) {
    return <HabitacionesCliente />;
  }

  if (name === 'servicios' && esCliente) {
    return <ServiciosCliente />;
  }

  if (name === 'paquetes' && esCliente) {
    return <PaquetesCliente />;
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <section className="module-page">

      {/* =====================================================
          CABECERA
      ====================================================== */}

      <div className="module-header">

        <div className="page-title">

          <div className="module-kicker">
            PAIE ROYALE · GESTIÓN
          </div>

          <h1>
            {title}
          </h1>

          <p>
            {esCliente && name === 'clientes'
              ? 'Consulta y actualiza la información permitida de tu perfil.'
              : <>Gestión y consulta de {title.toLowerCase()}.</>}
          </p>

        </div>

        <div className="module-search">

          <span
            className="module-search-icon"
            aria-hidden="true"
          >
            ⌕
          </span>

          <input
            type="text"
            placeholder={`Buscar en ${title.toLowerCase()}...`}
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            aria-label={`Buscar en ${title}`}
          />

          {search && (
            <button
              type="button"
              className="module-search-clear"
              onClick={() =>
                setSearch('')
              }
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}

        </div>

      </div>


      {/* =====================================================
          FORMULARIO
      ====================================================== */}

      {(puedeCrear || (esCliente && name === 'clientes' && editando)) && (

        <form
          className={`card module-form ${
            editando
              ? 'module-form-editing'
              : ''
          } ${
            name === 'usuarios'
              ? 'module-user-account-form'
              : ''
          }`}
          onSubmit={
            editando
              ? update
              : save
          }
        >

          <div className="module-form-header">

            <div>

              <span className="module-section-label">
                {editando
                  ? 'EDITAR REGISTRO'
                  : 'NUEVO REGISTRO'}
              </span>

              <h2>
                {editando
                  ? `Editar ${title.toLowerCase()}`
                  : `Crear ${title.toLowerCase()}`}
              </h2>

              <p>
                {editando
                  ? 'Modifica la información del registro seleccionado.'
                  : 'Completa la información para agregar un nuevo registro.'}
              </p>

            </div>

            {editando && (
              <span className="module-edit-indicator">
                Editando #{form.id}
              </span>
            )}

          </div>

          <div className="form module-form-grid">

            {name === 'usuarios'
              ? fs.map(
                  renderUserField
                )
              : fs.map(
                  renderGenericField
                )}

          </div>

          {name === 'habitaciones' && esAdministrador && (
            <div
              style={{
                marginTop: '20px',
                padding: '18px',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                borderRadius: '14px',
                background: 'rgba(15, 23, 42, 0.03)'
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: '6px'
                }}
              >
                Fotos de la habitación
              </div>

              <div
                style={{
                  fontSize: '13px',
                  opacity: 0.75,
                  marginBottom: '12px'
                }}
              >
                Puedes seleccionar varias imágenes JPG, PNG o WEBP.
                Cada imagen puede pesar hasta 8 MB.
              </div>

              <input
                className="module-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  setImagenesSeleccionadas(
                    Array.from(event.target.files || [])
                  );
                }}
              />

              {imagenesSeleccionadas.length > 0 && (
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '13px'
                  }}
                >
                  {imagenesSeleccionadas.length}{' '}
                  imagen(es) seleccionada(s) para subir.
                </div>
              )}

              {editando && (
                <div
                  style={{
                    marginTop: '20px'
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: '10px'
                    }}
                  >
                    Imágenes actuales
                  </div>

                  {cargandoImagenes ? (
                    <div style={{ fontSize: '13px' }}>
                      Cargando imágenes...
                    </div>
                  ) : imagenesHabitacion.length ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '12px'
                      }}
                    >
                      {imagenesHabitacion.map((imagen) => (
                        <div
                          key={imagen.id}
                          className="module-photo-card"
                          style={{
                            border: '1px solid rgba(148, 163, 184, 0.25)',
                            borderRadius: '12px',
                            padding: '10px',
                            background: '#fff',
                            color: '#1f2937'
                          }}
                        >
                          <img
                            src={urlImagenHabitacion(imagen.archivo)}
                            alt={
                              imagen.nombre_original ||
                              'Fotografía de habitación'
                            }
                            style={{
                              width: '100%',
                              height: '130px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              display: 'block',
                              marginBottom: '8px'
                            }}
                          />

                          <div
                            style={{
                              fontSize: '12px',
                              overflowWrap: 'anywhere',
                              marginBottom: '8px'
                            }}
                          >
                            {imagen.nombre_original ||
                              imagen.archivo}
                          </div>

                          <label
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              marginBottom: '8px',
                              color: '#334155',
                              fontWeight: 600
                            }}
                          >
                            Cambiar imagen
                            <input
                              className="module-file-input"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              style={{
                                display: 'block',
                                width: '100%',
                                marginTop: '5px'
                              }}
                              onChange={(event) => {
                                const archivo =
                                  event.target.files?.[0];

                                if (archivo) {
                                  reemplazarImagenHabitacion(
                                    form.id,
                                    imagen.id,
                                    archivo
                                  );
                                  event.target.value = '';
                                }
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            className="secondary danger module-photo-delete"
                            onClick={() =>
                              eliminarImagenHabitacion(
                                form.id,
                                imagen.id
                              )
                            }
                          >
                            Eliminar foto
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '13px',
                        opacity: 0.75
                      }}
                    >
                      Esta habitación todavía no tiene fotos.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {name === 'servicios' && esAdministrador && (
            <div className="service-image-admin" style={{ marginTop: '20px', padding: '18px', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.03)' }}>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>Fotos del servicio</div>
              <div style={{ fontSize: '13px', opacity: 0.75, marginBottom: '12px' }}>Puedes seleccionar varias imágenes JPG, PNG o WEBP. Cada imagen puede pesar hasta 8 MB.</div>
              <input className="module-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setImagenesSeleccionadas(Array.from(event.target.files || []))} />
              {imagenesSeleccionadas.length > 0 && <div style={{ marginTop: '10px', fontSize: '13px' }}>{imagenesSeleccionadas.length} imagen(es) seleccionada(s) para subir.</div>}
              {editando && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '10px' }}>Imágenes actuales</div>
                  {cargandoImagenes ? <div style={{ fontSize: '13px' }}>Cargando imágenes...</div> : imagenesServicio.length ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      {imagenesServicio.map((imagen) => (
                        <div key={imagen.id} className="module-photo-card" style={{ border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '12px', padding: '10px', background: '#fff', color: '#1f2937' }}>
                          <img src={urlImagenServicio(imagen.archivo)} alt={imagen.nombre_original || 'Fotografía de servicio'} style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '8px', display: 'block', marginBottom: '8px' }} />
                          <div style={{ fontSize: '12px', overflowWrap: 'anywhere', marginBottom: '8px' }}>{imagen.nombre_original || imagen.archivo}</div>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#334155', fontWeight: 600 }}>Cambiar imagen<input className="module-file-input" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'block', width: '100%', marginTop: '5px' }} onChange={(event) => { const archivo = event.target.files?.[0]; if (archivo) { reemplazarImagenServicio(form.id, imagen.id, archivo); event.target.value = ''; } }} /></label>
                          <button type="button" className="secondary danger module-photo-delete" onClick={() => eliminarImagenServicio(form.id, imagen.id)}>Eliminar foto</button>
                        </div>
                      ))}
                    </div>
                  ) : <div style={{ fontSize: '13px', opacity: 0.75 }}>Este servicio todavía no tiene fotos.</div>}
                </div>
              )}
            </div>
          )}

          {name === 'paquetes' && esAdministrador && (
            <div style={{ marginTop: '20px', padding: '18px', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.03)' }}>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>Fotos del paquete</div>
              <div style={{ fontSize: '13px', opacity: 0.75, marginBottom: '12px' }}>Puedes seleccionar varias imágenes JPG, PNG o WEBP. Cada imagen puede pesar hasta 8 MB.</div>
              <input className="module-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setImagenesSeleccionadas(Array.from(event.target.files || []))} />
              {imagenesSeleccionadas.length > 0 && <div style={{ marginTop: '10px', fontSize: '13px' }}>{imagenesSeleccionadas.length} imagen(es) seleccionada(s) para subir.</div>}
              {editando && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '10px' }}>Imágenes actuales</div>
                  {cargandoImagenes ? <div style={{ fontSize: '13px' }}>Cargando imágenes...</div> : imagenesPaquete.length ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      {imagenesPaquete.map((imagen) => (
                        <div key={imagen.id} className="module-photo-card" style={{ border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '12px', padding: '10px', background: '#fff', color: '#1f2937' }}>
                          <img src={`/api/v1/paquetes/imagenes/${encodeURIComponent(imagen.archivo)}`} alt={imagen.nombre_original || 'Fotografía de paquete'} style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '8px', display: 'block', marginBottom: '8px' }} />
                          <div style={{ fontSize: '12px', overflowWrap: 'anywhere', marginBottom: '8px' }}>{imagen.nombre_original || imagen.archivo}</div>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#334155', fontWeight: 600 }}>Cambiar imagen<input className="module-file-input" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'block', width: '100%', marginTop: '5px' }} onChange={(event) => { const archivo = event.target.files?.[0]; if (archivo) { reemplazarImagenPaquete(form.id, imagen.id, archivo); event.target.value = ''; } }} /></label>
                          <button type="button" className="secondary danger module-photo-delete" onClick={() => eliminarImagenPaquete(form.id, imagen.id)}>Eliminar foto</button>
                        </div>
                      ))}
                    </div>
                  ) : <div style={{ fontSize: '13px', opacity: 0.75 }}>Este paquete todavía no tiene fotos.</div>}
                </div>
              )}
            </div>
          )}

          {esCliente && name === 'clientes' && editando && (
            <div className="account-danger-zone">
              <div>
                <strong>Eliminar cuenta</strong>
                <p>Tu cuenta se desactivará de forma permanente y el correo quedará bloqueado para nuevos registros.</p>
              </div>
              <button type="button" className="secondary danger" onClick={eliminarMiCuenta}>
                Eliminar mi cuenta
              </button>
            </div>
          )}

          <div className="module-form-footer">

            <div className="module-form-note">
              {editando
                ? 'Los cambios se guardarán en el registro seleccionado.'
                : 'Revisa la información antes de guardar.'}
            </div>

            <div className="form-actions">

              <button
                type="submit"
                className="primary"
              >
                {editando
                  ? 'Guardar cambios'
                  : '+ Crear'}
              </button>

              {editando && (

                <button
                  type="button"
                  className="secondary"
                  onClick={
                    cancelarEdicion
                  }
                >
                  Cancelar
                </button>

              )}

            </div>

          </div>

        </form>

      )}


      {/* =====================================================
          MENSAJE
      ====================================================== */}

      {msg && (

        <div
          className={`notice module-notice ${
            msg.toLowerCase().includes('correctamente')
              ? 'module-notice-success'
              : 'module-notice-info'
          }`}
        >
          {msg}
        </div>

      )}


      {/* =====================================================
          TABLA
      ====================================================== */}

      <div className="card module-table-card">

        <div className="module-table-header">

          <div>

            <span className="module-section-label">
              REGISTROS
            </span>

            <h2>
              Lista de {title.toLowerCase()}
            </h2>

          </div>

          <div className="module-table-meta">

            <span
              className={
                loading
                  ? 'module-loading'
                  : ''
              }
            >
              {loading
                ? 'Actualizando...'
                : `${data.total || 0} registros`}
            </span>

          </div>

        </div>

        <div
          className="tablewrap"
          style={{
            maxHeight: (esAdministrador && name !== 'roles' && (data.rows?.length || 0) > 10) ? '620px' : 'none',
            overflowY: (esAdministrador && name !== 'roles' && (data.rows?.length || 0) > 10) ? 'auto' : 'visible'
          }}
        >

          <table>

            <thead>

              <tr>

                {columns.map(
                  (column) => (

                    <th
                      key={column}
                    >
                      {name === 'usuarios'
                        ? USER_LABELS[column] ||
                          column
                        : obtenerEtiquetaCampo(
                            column
                          )}
                    </th>

                  )
                )}

                {(puedeEditar ||
                  puedeEliminar) && (

                  <th className="module-actions-column">
                    Acciones
                  </th>

                )}

              </tr>

            </thead>

            <tbody>

              {data.rows?.map(
                (row) => (

                  <tr
                    key={row.id}
                  >

                    {columns.map(
                      (column) => (

                        <td
                          key={column}
                        >
                          {name === 'usuarios'
                            ? renderUserCell(
                                row,
                                column
                              )
                            : renderGenericCell(
                                row,
                                column
                              )}
                        </td>

                      )
                    )}

                    {(puedeEditar ||
                      puedeEliminar) && (

                      <td className="module-actions-cell">

                        <div className="module-row-actions">

                          {puedeEditar && (

                            <button
                              type="button"
                              className="secondary"
                              onClick={() =>
                                edit(row)
                              }
                            >
                              Editar
                            </button>

                          )}

                          {puedeEliminar && (

                            (
                              name !==
                                'habitaciones' ||
                              habitacionPuedeEliminarse(
                                row
                              )
                            ) && (

                              <button
                                type="button"
                                className="secondary danger"
                                onClick={() =>
                                  del(
                                    row.id,
                                    row
                                  )
                                }
                              >
                                Eliminar
                              </button>

                            )

                          )}

                        </div>

                      </td>

                    )}

                  </tr>

                )
              )}

            </tbody>

          </table>

          {!data.rows?.length && (

            <div className="empty module-empty">
              {loading
                ? 'Cargando registros...'
                : 'No hay registros para mostrar.'}
            </div>

          )}

        </div>

      </div>

    </section>
  );
}

