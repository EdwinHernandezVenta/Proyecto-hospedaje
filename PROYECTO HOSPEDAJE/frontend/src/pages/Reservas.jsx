import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  useLocation,
  useNavigate
} from 'react-router-dom';

import { api } from '../api/http';
import { useAuth } from '../context/AuthContext';


const money = (n) =>
  `$${Number(n || 0).toLocaleString('es-CO')}`;

const CART_KEY = 'paie_cart_cliente';

function leerCarritoCliente() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function contarProductosCarrito(items = leerCarritoCliente()) {
  return items.reduce(
    (sum, item) =>
      sum + Math.max(1, Number(item.cantidad || 1)),
    0
  );
}

function guardarCarritoCliente(items) {
  localStorage.setItem(
    CART_KEY,
    JSON.stringify(items)
  );

  window.dispatchEvent(
    new CustomEvent(
      'paie-cart-update',
      {
        detail: {
          items
        }
      }
    )
  );
}


/* =========================================================
   FECHA PARA DATETIME-LOCAL
========================================================= */

function formatDateInput(value) {

  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value)
      .slice(0, 16);
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');

  const hours =
    String(
      date.getHours()
    ).padStart(2, '0');

  const minutes =
    String(
      date.getMinutes()
    ).padStart(2, '0');

  return (
    `${year}-${month}-${day}` +
    `T${hours}:${minutes}`
  );
}


/* =========================================================
   NORMALIZAR
========================================================= */

function normalizarEstado(value) {

  return String(value || '')
    .trim()
    .toLowerCase();
}


/* =========================================================
   NORMALIZAR REFERENCIAS DE PAQUETE
========================================================= */

function normalizarReferenciaIncluida(value) {

  return String(value || '')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .trim()
    .replace(
      /\s+/g,
      ' '
    );
}


/* =========================================================
   OBTENER ELEMENTOS DE SERVICIOS_INCLUIDOS
========================================================= */

function obtenerInclusionesPaquete(valor) {

  if (
    Array.isArray(valor)
  ) {
    return valor
      .map(item =>
        typeof item === 'object'
          ? (
              item.nombre ||
              item.nombre_servicio ||
              item.descripcion ||
              item.numero_habitacion ||
              item
            )
          : item
      )
      .map(item =>
        String(item || '').trim()
      )
      .filter(Boolean);
  }

  if (
    typeof valor === 'string'
  ) {

    const texto =
      valor.trim();

    if (!texto) {
      return [];
    }

    try {

      const parsed =
        JSON.parse(texto);

      if (
        Array.isArray(parsed)
      ) {
        return obtenerInclusionesPaquete(
          parsed
        );
      }

    } catch {
      // El backend también admite texto separado por coma,
      // punto y coma o salto de línea.
    }

    return texto
      .split(
        /[,;\n]+/
      )
      .map(item =>
        item.trim()
      )
      .filter(Boolean);
  }

  if (
    valor &&
    typeof valor === 'object'
  ) {

    return obtenerInclusionesPaquete(
      Object.values(valor)
    );
  }

  return [];
}


/* =========================================================
   DETECTAR HABITACIÓN INCLUIDA EN UN PAQUETE
========================================================= */

function detectarHabitacionIncluida(
  paquete,
  habitaciones = []
) {

  const inclusiones =
    obtenerInclusionesPaquete(
      paquete?.servicios_incluidos
    );

  if (
    !inclusiones.length
  ) {
    return null;
  }

  for (
    const inclusion of inclusiones
  ) {

    const normalizada =
      normalizarReferenciaIncluida(
        inclusion
      );

    const match =
      normalizada.match(
        /(?:habitacion|hab|room)\s*(?:numero\s*)?(?:#\s*)?(\d+)/i
      );

    if (!match) {
      continue;
    }

    const numero =
      String(
        match[1]
      );

    const room =
      habitaciones.find(
        item =>
          String(
            item.numero_habitacion
          ).trim() === numero
      );

    if (room) {
      return room;
    }
  }

  return null;
}


/* =========================================================
   DETECTAR SERVICIO INCLUIDO EN UN PAQUETE
========================================================= */

function servicioEstaIncluidoEnPaquete(
  servicio,
  paquetes = []
) {
  const nombreServicio = normalizarReferenciaIncluida(
    servicio?.nombre || servicio?.nombre_servicio || ''
  );

  if (!nombreServicio) {
    return false;
  }

  return paquetes.some(paquete =>
    obtenerInclusionesPaquete(
      paquete?.servicios_incluidos
    ).some(inclusion => {
      const referencia = normalizarReferenciaIncluida(inclusion);

      /* Una inclusión de habitación no representa un servicio. */
      if (
        /^(?:habitacion|hab|room)\s*(?:numero\s*)?(?:#\s*)?\d+/i.test(
          referencia
        )
      ) {
        return false;
      }

      return referencia === nombreServicio;
    })
  );
}


/* =========================================================
   DETECTAR INCLUSIONES DEL CARRITO
========================================================= */

function analizarCarrito(
  items = [],
  habitaciones = []
) {

  const servicios =
    items.filter(
      item =>
        item.tipo === 'servicio'
    );

  const paquetes =
    items.filter(
      item =>
        item.tipo === 'paquete'
    );

  const paquetesConHabitacion =
    paquetes
      .map(paquete => ({
        paquete,
        habitacion:
          detectarHabitacionIncluida(
            paquete,
            habitaciones
          )
      }))
      .filter(
        item =>
          item.habitacion
      );

  const tieneHabitacionIncluida =
    paquetesConHabitacion.length > 0;

  const tieneServicio =
    servicios.length > 0;

  const tienePaquete =
    paquetes.length > 0;

  return {
    servicios,
    paquetes,
    paquetesConHabitacion,
    tieneHabitacionIncluida,
    tieneServicio,
    tienePaquete,
    tieneRecursos:
      tieneServicio ||
      tienePaquete
  };
}


/* =========================================================
   COMPONENTE
========================================================= */

export default function Reservas() {

  const { user } =
    useAuth();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const isAdmin =
    user?.rol ===
    'Administrador';


  const [rows, setRows] =
    useState([]);

  const [clientes, setClientes] =
    useState([]);

  const [habitaciones, setHabitaciones] =
    useState([]);

  const [msg, setMsg] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [carrito, setCarrito] =
    useState(
      () =>
        leerCarritoCliente()
    );


  /* =========================================================
     SELECTOR DE CLIENTES
  ========================================================= */

  const [
    mostrarSelectorCliente,
    setMostrarSelectorCliente
  ] = useState(false);

  const [
    filtroCliente,
    setFiltroCliente
  ] = useState('');

  const [
    letraCliente,
    setLetraCliente
  ] = useState('TODOS');


  /* =========================================================
     SELECTOR DE HABITACIONES PARA ADMINISTRADOR
  ========================================================= */

  const [
    mostrarSelectorHabitacion,
    setMostrarSelectorHabitacion
  ] = useState(false);

  const [
    filtroHabitacion,
    setFiltroHabitacion
  ] = useState('');


  const [
    reservaEditando,
    setReservaEditando
  ] = useState(null);

  const [
    editForm,
    setEditForm
  ] = useState({
    id_cliente: '',
    id_habitacion: '',
    fecha_inicio: '',
    fecha_fin: '',
    numero_personas: 1,
    notas: ''
  });


  const fechaInicioRef =
    useRef(null);

  const fechaFinRef =
    useRef(null);


  const [f, setF] =
    useState({
      id_cliente: '',
      id_habitacion: '',
      fecha_inicio: '',
      fecha_fin: '',
      numero_personas: 1,
      valor_total: 0,
      notas: ''
    });


  /* =========================================================
     CLIENTES ACTIVOS
  ========================================================= */

  const clientesActivos =
    useMemo(
      () =>
        clientes
          .filter(cliente => {

            const estado =
              normalizarEstado(
                cliente.estado
              );

            return (
              estado === 'activo' ||
              estado === '1' ||
              estado === 'true'
            );

          })
          .sort((a, b) => {

            const nombreA =
              `${a.nombre || ''} ${a.apellido || ''}`
                .trim();

            const nombreB =
              `${b.nombre || ''} ${b.apellido || ''}`
                .trim();

            return nombreA.localeCompare(
              nombreB,
              'es',
              {
                sensitivity:
                  'base'
              }
            );

          }),
      [clientes]
    );


  /* =========================================================
     CLIENTES FILTRADOS
  ========================================================= */

  const clientesFiltrados =
    useMemo(() => {

      const texto =
        normalizarEstado(
          filtroCliente
        );

      return clientesActivos
        .filter(cliente => {

          const nombreCompleto =
            `${cliente.nombre || ''} ${cliente.apellido || ''}`
              .trim();

          const nombreNormalizado =
            normalizarEstado(
              nombreCompleto
            );

          const correoNormalizado =
            normalizarEstado(
              cliente.correo
            );

          const coincideTexto =
            !texto ||
            nombreNormalizado.includes(
              texto
            ) ||
            correoNormalizado.includes(
              texto
            );

          const inicial =
            String(
              cliente.nombre || ''
            )
              .trim()
              .charAt(0)
              .toUpperCase();

          const coincideLetra =
            letraCliente === 'TODOS' ||
            inicial ===
              letraCliente;

          return (
            coincideTexto &&
            coincideLetra
          );

        });

    }, [
      clientesActivos,
      filtroCliente,
      letraCliente
    ]);


  /* =========================================================
     CLIENTE SELECCIONADO
  ========================================================= */

  const clienteSeleccionado =
    useMemo(
      () =>
        clientes.find(
          cliente =>
            String(cliente.id) ===
            String(f.id_cliente)
        ),
      [
        clientes,
        f.id_cliente
      ]
    );


  /* =========================================================
     HABITACIONES FILTRADAS PARA EL SELECTOR ADMINISTRADOR
  ========================================================= */

  const habitacionesActivas =
    useMemo(
      () =>
        habitaciones
          .filter(room =>
            normalizarEstado(room.estado) !== 'inhabilitada'
          )
          .sort((a, b) =>
            String(a.numero_habitacion || '').localeCompare(
              String(b.numero_habitacion || ''),
              'es',
              { numeric: true, sensitivity: 'base' }
            )
          ),
      [habitaciones]
    );


  const habitacionesFiltradas =
    useMemo(() => {
      const texto = normalizarEstado(filtroHabitacion);

      if (!texto) {
        return habitacionesActivas;
      }

      return habitacionesActivas.filter(room => {
        const numero = normalizarEstado(room.numero_habitacion);
        const tipo = normalizarEstado(room.tipo_habitacion);
        const capacidad = normalizarEstado(room.capacidad_maxima);

        return (
          numero.includes(texto) ||
          tipo.includes(texto) ||
          capacidad.includes(texto)
        );
      });
    }, [habitacionesActivas, filtroHabitacion]);


  const habitacionSeleccionada =
    useMemo(
      () =>
        habitaciones.find(
          room =>
            String(room.id) ===
            String(f.id_habitacion)
        ),
      [habitaciones, f.id_habitacion]
    );


  /* =========================================================
     ANÁLISIS DEL CARRITO
  ========================================================= */

  const resumenCarrito =
    useMemo(
      () =>
        analizarCarrito(
          carrito,
          habitaciones
        ),
      [
        carrito,
        habitaciones
      ]
    );


  /*
   * Habitación incluida por un paquete.
   *
   * Si existen varias, mostramos todas en el resumen,
   * pero para la lógica de personas usamos la primera,
   * exactamente porque el backend es quien finalmente
   * expande los recursos del paquete.
   */

  const habitacionesIncluidas =
    useMemo(
      () => {

        const resultado = [];

        resumenCarrito
          .paquetesConHabitacion
          .forEach(item => {

            if (
              !item.habitacion
            ) {
              return;
            }

            const existe =
              resultado.some(
                room =>
                  Number(room.id) ===
                  Number(
                    item.habitacion.id
                  )
              );

            if (!existe) {
              resultado.push(
                item.habitacion
              );
            }

          });

        return resultado;

      },
      [
        resumenCarrito
      ]
    );


  const habitacionIncluidaPrincipal =
    habitacionesIncluidas[0] ||
    null;


  /*
   * Cuando el paquete incluye una habitación y el cliente
   * no ha escogido una habitación adicional, usamos la
   * capacidad de la habitación incluida como referencia
   * visual para el número de personas.
   *
   * No enviamos esa habitación como id_habitacion:
   * el backend ya la agrega mediante expandirRecursosDePaquetes().
   */

  const habitacionParaCapacidad =
    selectedRoomSafe(
      habitaciones,
      f.id_habitacion
    ) ||
    habitacionIncluidaPrincipal ||
    null;


  /* =========================================================
     CARGAR
  ========================================================= */

  async function load() {

    setLoading(true);

    try {

      const response =
        await api.get(
          '/reservas'
        );

      const reservas =
        Array.isArray(
          response.data?.rows
        )
          ? response.data.rows
          : [];

      setRows(
        reservas
      );

    } catch (error) {

      setMsg(
        error.response?.data?.message ||
        'No se pudieron cargar las reservas.'
      );

    } finally {

      setLoading(false);

    }
  }


  /* =========================================================
     CATALOGOS
  ========================================================= */

  async function loadCatalogs() {

    try {

      const habitacionesResponse =
        await api.get(
          '/habitaciones',
          {
            params: {
              page: 1,
              limit: 100,
              catalogo_reservas: 1
            }
          }
        );

      const habitacionesRows =
        Array.isArray(
          habitacionesResponse.data?.rows
        )
          ? habitacionesResponse.data.rows
          : [];

      setHabitaciones(
        habitacionesRows.filter((habitacion) => normalizarEstado(habitacion.estado) === 'disponible')
      );


      if (isAdmin) {

        const clientesResponse =
          await api.get(
            '/clientes?limit=100'
          );

        const clientesRows =
          Array.isArray(
            clientesResponse.data?.rows
          )
            ? clientesResponse.data.rows
            : [];

        setClientes(
          clientesRows
        );

      } else {

        setClientes([]);

      }

    } catch (error) {

      setMsg(
        error.response?.data?.message ||
        'No se pudieron cargar los catálogos.'
      );

    }
  }


  useEffect(() => {

    load();
    loadCatalogs();

  }, [isAdmin]);

  useEffect(() => {
    const idEdicion = new URLSearchParams(location.search).get('editar');
    if (!idEdicion || !rows.length || !isAdmin) return;
    const reserva = rows.find((item) => Number(item.id) === Number(idEdicion));
    if (reserva) iniciarEdicion(reserva);
    navigate('/reservas', { replace: true });
  }, [location.search, rows, isAdmin, navigate]);


  useEffect(() => {

    const actualizarCarrito =
      (event) => {

        const items =
          Array.isArray(
            event.detail?.items
          )
            ? event.detail.items
            : leerCarritoCliente();

        setCarrito(
          items
        );

      };

    window.addEventListener(
      'paie-cart-update',
      actualizarCarrito
    );

    return () =>
      window.removeEventListener(
        'paie-cart-update',
        actualizarCarrito
      );

  }, []);


  function cambiarCantidadCarrito(
    tipo,
    id,
    cantidad
  ) {

    const items =
      leerCarritoCliente()
        .map(item => {

          if (
            item.tipo !== tipo ||
            Number(item.id) !==
              Number(id)
          ) {
            return item;
          }

          return {
            ...item,
            cantidad:
              Math.max(
                1,
                Number(
                  cantidad || 1
                )
              )
          };

        });

    guardarCarritoCliente(
      items
    );

    setCarrito(
      items
    );
  }


  function quitarDelCarrito(
    tipo,
    id
  ) {

    const items =
      leerCarritoCliente()
        .filter(
          item =>
            !(
              item.tipo === tipo &&
              Number(item.id) ===
                Number(id)
            )
        );

    guardarCarritoCliente(
      items
    );

    setCarrito(
      items
    );
  }


  /* =========================================================
     RESULTADO TARJETA
  ========================================================= */

  useEffect(() => {

    const state =
      location.state;

    if (
      !state?.pagoRegistrado
    ) {
      return;
    }

    setMsg(
      state.message ||
      'Pago registrado correctamente.'
    );

    navigate(
      '/reservas',
      {
        replace: true,
        state: null
      }
    );

    load();

  }, [
    location.state,
    navigate
  ]);


  /* =========================================================
     RESERVAR DESDE HABITACIONES CLIENTE
  ========================================================= */

  useEffect(() => {

    const idHabitacion =
      location.state?.id_habitacion;

    if (
      !idHabitacion ||
      !habitaciones.length
    ) {
      return;
    }

    const room =
      habitaciones.find(
        item =>
          String(item.id) ===
          String(idHabitacion)
      );

    if (!room) {
      return;
    }

    setF(previous => ({
      ...previous,
      id_habitacion:
        String(room.id),
      numero_personas:
        isAdmin
          ? previous.numero_personas
          : Number(
              room.capacidad_maxima || 1
            )
    }));

    navigate(
      '/reservas',
      {
        replace: true,
        state: null
      }
    );

  }, [
    location.state,
    habitaciones,
    isAdmin,
    navigate
  ]);


  /* =========================================================
     HABITACIÓN
  ========================================================= */

  const selectedRoom =
    useMemo(
      () =>
        habitaciones.find(
          room =>
            String(room.id) ===
            String(
              f.id_habitacion
            )
        ),
      [
        habitaciones,
        f.id_habitacion
      ]
    );


  /* =========================================================
     CAPACIDAD DE HABITACIÓN PARA CLIENTE
  ========================================================= */

  useEffect(() => {

    if (
      !isAdmin &&
      selectedRoom
    ) {

      const capacidad =
        Number(
          selectedRoom.capacidad_maxima || 0
        );

      if (
        capacidad > 0
      ) {

        setF(previous => ({
          ...previous,
          numero_personas:
            capacidad
        }));

      }

    }

  }, [
    selectedRoom,
    isAdmin
  ]);


  /*
   * Si no hay habitación seleccionada pero el paquete incluye
   * una habitación, usamos su capacidad para el formulario.
   *
   * Esto no sustituye la lógica del backend.
   */

  useEffect(() => {

    if (
      isAdmin ||
      selectedRoom ||
      !habitacionIncluidaPrincipal
    ) {
      return;
    }

    const capacidad =
      Number(
        habitacionIncluidaPrincipal.capacidad_maxima || 0
      );

    if (
      capacidad > 0
    ) {

      setF(previous => ({
        ...previous,
        numero_personas:
          capacidad
      }));

    }

  }, [
    isAdmin,
    selectedRoom,
    habitacionIncluidaPrincipal
  ]);


  /* =========================================================
     TOTAL
  ========================================================= */

  useEffect(() => {

    /*
     * Sin fechas todavía no podemos calcular las noches
     * de una habitación.
     *
     * Si no existe habitación independiente, el total de
     * servicios y paquetes sí puede conocerse, pero para
     * mantener la lógica del formulario se espera a tener
     * ambas fechas.
     */

    if (
      !f.fecha_inicio ||
      !f.fecha_fin
    ) {
      return;
    }

    const start =
      new Date(
        f.fecha_inicio
      );

    const end =
      new Date(
        f.fecha_fin
      );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      )
    ) {
      return;
    }

    const ms =
      end - start;

    if (
      ms <= 0
    ) {
      return;
    }

    const nights =
      Math.max(
        1,
        Math.ceil(
          ms / 86400000
        )
      );


    /*
     * IMPORTANTE:
     *
     * La habitación incluida en un paquete NO se suma aquí.
     * El backend la marca como incluido_en_paquete y su
     * subtotal queda en 0.
     *
     * Solo cobramos una habitación si el usuario seleccionó
     * una habitación independiente en f.id_habitacion.
     */

    const habitacionIncluidaSeleccionada =
      selectedRoom
        ? carrito.some(item =>
            item.tipo === 'paquete' &&
            detectarHabitacionIncluida(
              item,
              habitaciones
            )?.id === selectedRoom.id
          )
        : false;

    const totalHabitacion =
      selectedRoom && !habitacionIncluidaSeleccionada
        ? Number(selectedRoom.tarifa || 0) * nights
        : 0;

    const totalExtras =
      carrito.reduce((sum, item) => {
        const cantidad = Math.max(
          1,
          Number(item.cantidad || 1)
        );

        if (item.tipo === 'servicio') {
          const incluido = servicioEstaIncluidoEnPaquete(
            item,
            carrito.filter(
              recurso => recurso.tipo === 'paquete'
            )
          );

          if (incluido) {
            return sum;
          }
        }

        return (
          sum +
          Number(item.precio || 0) * cantidad
        );
      }, 0);

    setF(previous => ({
      ...previous,
      valor_total:
        totalHabitacion +
        totalExtras
    }));

  }, [
    selectedRoom,
    f.fecha_inicio,
    f.fecha_fin,
    carrito
  ]);


  /* =========================================================
     CREAR RESERVA
  ========================================================= */

  async function crear(e) {

    e.preventDefault();

    setMsg('');

    try {

      const total =
        Number(
          f.valor_total
        );


      if (
        isAdmin &&
        !f.id_cliente
      ) {

        setMsg(
          'Selecciona un cliente.'
        );

        return;
      }


      /*
       * Ya no obligamos a tener habitación.
       *
       * Una reserva puede contener:
       *
       * - habitación
       * - servicio
       * - paquete
       * - habitación + servicio
       * - habitación + paquete
       * - paquete con recursos incluidos
       *
       * Lo único obligatorio es que exista al menos un
       * recurso entre habitación, servicio o paquete.
       */

      if (
        !f.id_habitacion &&
        !carrito.length
      ) {

        setMsg(
          'Selecciona una habitación o agrega al carrito al menos un servicio o paquete.'
        );

        return;
      }


      if (
        !f.fecha_inicio ||
        !f.fecha_fin
      ) {

        setMsg(
          'Selecciona la fecha de entrada y la fecha de salida.'
        );

        return;
      }


      const inicio =
        new Date(
          f.fecha_inicio
        );

      const fin =
        new Date(
          f.fecha_fin
        );


      if (
        Number.isNaN(
          inicio.getTime()
        ) ||
        Number.isNaN(
          fin.getTime()
        )
      ) {

        setMsg(
          'Las fechas seleccionadas no son válidas.'
        );

        return;
      }


      if (
        fin <= inicio
      ) {

        setMsg(
          'La fecha de salida debe ser posterior a la entrada.'
        );

        return;
      }


      if (
        total <= 0
      ) {

        setMsg(
          'El valor total debe ser mayor que 0.'
        );

        return;
      }


      const personas =
        Number(
          f.numero_personas
        );


      if (
        !Number.isInteger(
          personas
        ) ||
        personas < 1
      ) {

        setMsg(
          'El número de personas debe ser mínimo 1.'
        );

        return;
      }


      /*
       * La habitación incluida por un paquete NO se agrega
       * manualmente aquí.
       *
       * El backend ya ejecuta:
       *
       * expandirRecursosDePaquetes(...)
       *
       * y agrega automáticamente la habitación/servicio
       * incluido.
       *
       * Así evitamos duplicar recursos.
       */

      const detalles = [
        ...(f.id_habitacion
          ? [
              {
                id_habitacion:
                  Number(
                    f.id_habitacion
                  ),
                cantidad: 1,
                subtotal: 0
              }
            ]
          : []),

        ...carrito.map(
          item => ({
            id_servicio:
              item.tipo === 'servicio'
                ? Number(item.id)
                : undefined,

            id_paquete:
              item.tipo === 'paquete'
                ? Number(item.id)
                : undefined,

            cantidad:
              Math.max(
                1,
                Number(
                  item.cantidad || 1
                )
              ),

            subtotal:
              Number(
                item.precio || 0
              ) *
              Math.max(
                1,
                Number(
                  item.cantidad || 1
                )
              )
          })
        )
      ];


      const reservaCreada = await api.post(
        '/reservas',
        {
          id_cliente:
            isAdmin
              ? Number(
                  f.id_cliente
                )
              : undefined,

          fecha_inicio:
            f.fecha_inicio,

          fecha_fin:
            f.fecha_fin,

          numero_personas:
            personas,

          valor_total:
            total,

          anticipo:
            total,

          notas:
            f.notas,

          detalles
        }
      );


      guardarCarritoCliente(
        []
      );

      setCarrito(
        []
      );


      setMsg('Reserva creada correctamente. Continúa en Pagos para completar el 100 %.');


      setF({
        id_cliente: '',
        id_habitacion: '',
        fecha_inicio: '',
        fecha_fin: '',
        numero_personas: 1,
        valor_total: 0,
        notas: ''
      });


      await load();
      await loadCatalogs();
      navigate(`/pagos?reserva=${reservaCreada.data?.id}`);

    } catch (error) {

      setMsg(
        error.response?.data?.message ||
        'No se pudo crear la reserva.'
      );

    }
  }


  /* =========================================================
     EDITAR RESERVA - ADMINISTRADOR
  ========================================================= */

  function iniciarEdicion(
    r
  ) {

    if (!isAdmin) {
      return;
    }

    const estadoPago = normalizarEstado(r.pago_estado);
    if (estadoPago === 'confirmado' || estadoPago === 'pendiente') {
      setMsg('Esta reserva no puede editarse porque ya registra un pago o un pago pendiente de verificación.');
      return;
    }

    const habitacionId =
      r.id_habitacion ||
      r.habitacion_id ||
      r.id_habitacion_reserva ||
      '';

    setReservaEditando(
      r
    );

    setEditForm({
      id_cliente:
        r.id_cliente
          ? String(
              r.id_cliente
            )
          : '',

      id_habitacion:
        habitacionId
          ? String(
              habitacionId
            )
          : '',

      fecha_inicio:
        formatDateInput(
          r.fecha_inicio
        ),

      fecha_fin:
        formatDateInput(
          r.fecha_fin
        ),

      numero_personas:
        Number(
          r.numero_personas || 1
        ),

      notas:
        r.notas || ''
    });

    setMsg('');
  }


  function cerrarEdicion() {

    setReservaEditando(
      null
    );

  }


  async function guardarEdicion(
    event
  ) {

    event.preventDefault();

    if (
      !reservaEditando
    ) {
      return;
    }

    try {

      const inicio =
        new Date(
          editForm.fecha_inicio
        );

      const fin =
        new Date(
          editForm.fecha_fin
        );

      const personas =
        Number(
          editForm.numero_personas
        );


      if (
        !editForm.id_cliente
      ) {

        setMsg(
          'Selecciona un cliente.'
        );

        return;
      }


      if (
        !editForm.id_habitacion
      ) {

        setMsg(
          'Selecciona una habitación.'
        );

        return;
      }


      if (
        Number.isNaN(
          inicio.getTime()
        ) ||
        Number.isNaN(
          fin.getTime()
        )
      ) {

        setMsg(
          'Las fechas indicadas no son válidas.'
        );

        return;
      }


      if (
        fin <= inicio
      ) {

        setMsg(
          'La fecha de salida debe ser posterior a la entrada.'
        );

        return;
      }


      if (
        !Number.isInteger(
          personas
        ) ||
        personas < 1
      ) {

        setMsg(
          'El número de personas debe ser mínimo 1.'
        );

        return;
      }


      const room =
        habitaciones.find(
          item =>
            String(item.id) ===
            String(
              editForm.id_habitacion
            )
        );


      if (!room) {

        setMsg(
          'La habitación seleccionada no existe en el catálogo.'
        );

        return;
      }


      const response =
        await api.put(
          `/reservas/${reservaEditando.id}`,
          {
            id_cliente:
              Number(
                editForm.id_cliente
              ),

            id_habitacion:
              Number(
                editForm.id_habitacion
              ),

            fecha_inicio:
              editForm.fecha_inicio,

            fecha_fin:
              editForm.fecha_fin,

            numero_personas:
              personas,

            notas:
              editForm.notas
          }
        );


      const nuevoTotal = Number(response.data?.valor_total || 0);

      setMsg(
        nuevoTotal > 0
          ? `Reserva actualizada. Nuevo total pendiente: ${money(nuevoTotal)}.`
          : (response.data?.message || 'Reserva actualizada correctamente.')
      );

      setReservaEditando(
        null
      );

      await load();
      await loadCatalogs();

    } catch (error) {

      setMsg(
        error.response?.data?.message ||
        'No se pudo actualizar la reserva.'
      );

    }
  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <>

      <section>

        {isAdmin && (

          <div className="page-title">

            <h1>
              Reservas
            </h1>

            <p>
              Gestiona tus reservas,
              fechas y pagos.
            </p>

          </div>

        )}


        {/* =====================================================
            NUEVA RESERVA
        ===================================================== */}

        <div className="card reservation-create-card">

          <div className="title">

            <h3>
              Nueva reserva
            </h3>

          </div>


          {carrito.length > 0 && (

            <div
              style={{
                marginBottom:
                  '18px',
                padding:
                  '18px',
                borderRadius:
                  '14px',
                border:
                  '1px solid rgba(229,193,88,.28)',
                background:
                  'rgba(229,193,88,.05)'
              }}
            >

              <div
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'center',
                  gap:
                    '12px',
                  flexWrap:
                    'wrap',
                  marginBottom:
                    '12px'
                }}
              >

                <div>

                  <strong
                    style={{
                      color:
                        '#fff'
                    }}
                  >
                    Carrito de servicios y paquetes ·{' '}
                    {contarProductosCarrito(
                      carrito
                    )}{' '}
                    producto
                    {contarProductosCarrito(
                      carrito
                    ) === 1
                      ? ''
                      : 's'}
                  </strong>

                  <div
                    style={{
                      color:
                        'var(--muted)',
                      fontSize:
                        '13px',
                      marginTop:
                        '4px'
                    }}
                  >
                    Se agregarán a esta reserva.
                  </div>

                </div>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    guardarCarritoCliente(
                      []
                    );
                    setCarrito(
                      []
                    );
                  }}
                >
                  Vaciar carrito
                </button>

              </div>


              <div
                style={{
                  display:
                    'grid',
                  gap:
                    '8px'
                }}
              >

                {carrito.map(
                  item => (

                    <div
                      key={`${item.tipo}-${item.id}`}
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          '1fr auto auto auto',
                        gap:
                          '10px',
                        alignItems:
                          'center',
                        padding:
                          '10px 12px',
                        borderRadius:
                          '10px',
                        background:
                          'rgba(255,255,255,.035)'
                      }}
                    >

                      <div>

                        <strong
                          style={{
                            color:
                              '#fff'
                          }}
                        >
                          {item.nombre}
                        </strong>

                        <div
                          style={{
                            color:
                              '#e5c158',
                            fontSize:
                              '13px'
                          }}
                        >
                          {item.tipo === 'servicio'
                            ? 'Servicio'
                            : 'Paquete'}
                          {' · '}
                          {money(
                            item.precio
                          )}
                          {' c/u'}
                        </div>

                        {item.tipo === 'paquete' &&
                          obtenerInclusionesPaquete(
                            item.servicios_incluidos
                          ).length > 0 && (

                          <div
                            style={{
                              marginTop:
                                '6px',
                              color:
                                'rgba(255,255,255,.55)',
                              fontSize:
                                '12px'
                            }}
                          >
                            Incluye:{' '}
                            {obtenerInclusionesPaquete(
                              item.servicios_incluidos
                            ).join(
                              ' · '
                            )}
                          </div>

                        )}

                      </div>


                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          cambiarCantidadCarrito(
                            item.tipo,
                            item.id,
                            Number(
                              item.cantidad || 1
                            ) - 1
                          )
                        }
                        disabled={
                          Number(
                            item.cantidad || 1
                          ) <= 1
                        }
                      >
                        −
                      </button>


                      <span
                        style={{
                          color:
                            '#fff',
                          minWidth:
                            '24px',
                          textAlign:
                            'center'
                        }}
                      >
                        {item.cantidad}
                      </span>


                      <div
                        style={{
                          display:
                            'flex',
                          gap:
                            '6px'
                        }}
                      >

                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            cambiarCantidadCarrito(
                              item.tipo,
                              item.id,
                              Number(
                                item.cantidad || 1
                              ) + 1
                            )
                          }
                        >
                          +
                        </button>

                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            quitarDelCarrito(
                              item.tipo,
                              item.id
                            )
                          }
                        >
                          Quitar
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

          )}


          {/* =====================================================
              RESUMEN DE INCLUSIONES
          ===================================================== */}

          {habitacionesIncluidas.length > 0 && (

            <div
              style={{
                marginBottom:
                  '18px',
                padding:
                  '16px 18px',
                borderRadius:
                  '14px',
                border:
                  '1px solid rgba(229,193,88,.24)',
                background:
                  'linear-gradient(135deg, rgba(229,193,88,.075), rgba(255,255,255,.025))'
              }}
            >

              <div
                style={{
                  color:
                    '#e5c158',
                  fontSize:
                    '12px',
                  fontWeight:
                    800,
                  letterSpacing:
                    '0.08em',
                  marginBottom:
                    '8px'
                }}
              >
                HABITACIÓN INCLUIDA EN EL PAQUETE
              </div>


              {habitacionesIncluidas.map(
                room => (

                  <div
                    key={room.id}
                    style={{
                      display:
                        'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'space-between',
                      gap:
                        '12px',
                      flexWrap:
                        'wrap'
                    }}
                  >

                    <div>

                      <strong
                        style={{
                          color:
                            '#fff'
                        }}
                      >
                        Habitación #{room.numero_habitacion}
                      </strong>

                      <div
                        style={{
                          color:
                            'var(--muted)',
                          fontSize:
                            '13px',
                          marginTop:
                            '4px'
                        }}
                      >
                        {room.tipo_habitacion ||
                          'Habitación'}
                        {' · '}
                        Capacidad:{' '}
                        {room.capacidad_maxima ||
                          '—'}{' '}
                        personas
                      </div>

                    </div>


                    <span
                      style={{
                        color:
                          '#e5c158',
                        fontSize:
                          '12px',
                        fontWeight:
                          800,
                        padding:
                          '7px 10px',
                        borderRadius:
                          '999px',
                        background:
                          'rgba(229,193,88,.10)',
                        border:
                          '1px solid rgba(229,193,88,.18)'
                      }}
                    >
                      INCLUIDA
                    </span>

                  </div>

                )
              )}


              <div
                style={{
                  marginTop:
                    '10px',
                  color:
                    'rgba(255,255,255,.52)',
                  fontSize:
                    '12px',
                  lineHeight:
                    1.5
                }}
              >
                Esta habitación será agregada automáticamente por el paquete y no se cobrará nuevamente como habitación independiente.
              </div>

            </div>

          )}


          <form
            className="form reservation-form"
            onSubmit={crear}
          >

            {isAdmin && (

              <div className="field">

                <label>
                  CLIENTE
                </label>

                <button
                  type="button"
                  onClick={() => {

                    setFiltroCliente('');
                    setLetraCliente('TODOS');
                    setMostrarSelectorCliente(true);

                  }}
                  style={{
                    width:
                      '100%',
                    minHeight:
                      '54px',
                    padding:
                      '0 16px',
                    borderRadius:
                      '12px',
                    border:
                      '1px solid rgba(255,255,255,0.12)',
                    background:
                      'rgba(255,255,255,0.045)',
                    color:
                      clienteSeleccionado
                        ? '#fff'
                        : 'var(--muted)',
                    textAlign:
                      'left',
                    cursor:
                      'pointer',
                    fontSize:
                      '15px',
                    fontWeight:
                      clienteSeleccionado
                        ? 700
                        : 500,
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'space-between',
                    gap:
                      '12px',
                    boxSizing:
                      'border-box'
                  }}
                >

                  <span>
                    {clienteSeleccionado
                      ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`.trim()
                      : 'Seleccionar cliente'}
                  </span>

                  <span
                    style={{
                      color:
                        '#e5c158',
                      fontSize:
                        '20px',
                      lineHeight:
                        1
                    }}
                  >
                    ›
                  </span>

                </button>



              </div>

            )}


            {/* =================================================
                HABITACIÓN
            ================================================= */}

            <div className="field">

              <label>
                {resumenCarrito.tieneHabitacionIncluida
                  ? 'HABITACIÓN ADICIONAL (OPCIONAL)'
                  : 'HABITACIÓN (OPCIONAL)'}
              </label>


              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroHabitacion('');
                      setMostrarSelectorHabitacion(true);
                    }}
                    style={{
                      width: '100%',
                      minHeight: '54px',
                      padding: '0 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.045)',
                      color: habitacionSeleccionada
                        ? '#fff'
                        : 'var(--muted)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: habitacionSeleccionada ? 700 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span>
                      {habitacionSeleccionada
                        ? `#${habitacionSeleccionada.numero_habitacion} · ${habitacionSeleccionada.tipo_habitacion || 'Habitación'}`
                        : (resumenCarrito.tieneHabitacionIncluida
                          ? 'Sin habitación adicional'
                          : 'Sin habitación')}
                    </span>

                    <span
                      style={{
                        color: '#e5c158',
                        fontSize: '20px',
                        lineHeight: 1
                      }}
                    >
                      ›
                    </span>
                  </button>


                </>
              ) : (
                <select
                  value={f.id_habitacion}
                  onChange={e => {
                    const room = habitaciones.find(
                      item => String(item.id) === String(e.target.value)
                    );

                    setF(previous => ({
                      ...previous,
                      id_habitacion: e.target.value,
                      numero_personas: room
                        ? Number(room.capacidad_maxima || 1)
                        : previous.numero_personas
                    }));
                  }}
                >
                  <option value="">
                    {resumenCarrito.tieneHabitacionIncluida
                      ? 'Sin habitación adicional'
                      : 'Sin habitación'}
                  </option>

                  {habitacionesActivas.map(room => (
                    <option key={room.id} value={room.id}>
                      #{room.numero_habitacion}
                      {' · '}
                      {room.tipo_habitacion}
                      {' · '}
                      {money(room.tarifa)}
                      {' / noche'}
                    </option>
                  ))}
                </select>
              )}

            </div>

            {/* =================================================
                FECHA ENTRADA
            ================================================= */}

            <div className="field reservation-date-field">

              <label>
                FECHA Y HORA DE ENTRADA
              </label>

              <input
                ref={
                  fechaInicioRef
                }
                type="datetime-local"
                value={
                  f.fecha_inicio
                }
                min={
                  formatDateInput(
                    new Date()
                  )
                }
                onChange={e => {

                  const value =
                    e.target.value;

                  setF(previous => ({
                    ...previous,
                    fecha_inicio:
                      value
                  }));

                  if (value) {

                    requestAnimationFrame(
                      () => {
                        fechaFinRef.current?.focus();
                      }
                    );

                  }

                }}
                required
              />

            </div>


            {/* =================================================
                FECHA SALIDA
            ================================================= */}

            <div className="field reservation-date-field">

              <label>
                FECHA Y HORA DE SALIDA
              </label>

              <input
                ref={
                  fechaFinRef
                }
                type="datetime-local"
                value={
                  f.fecha_fin
                }
                min={
                  f.fecha_inicio ||
                  formatDateInput(
                    new Date()
                  )
                }
                onChange={e =>
                  setF({
                    ...f,
                    fecha_fin:
                      e.target.value
                  })
                }
                required
              />

            </div>


            {/* =================================================
                PERSONAS
            ================================================= */}

            <div className="field">

              <label>
                PERSONAS
              </label>

              <input
                type="number"
                min="1"
                value={
                  f.numero_personas
                }
                onChange={e => {

                  if (!isAdmin) {
                    return;
                  }

                  setF(previous => ({
                    ...previous,
                    numero_personas:
                      e.target.value
                  }));

                }}
                readOnly={!isAdmin}
                disabled={!isAdmin}
                title={
                  !isAdmin &&
                  habitacionParaCapacidad
                    ? `Capacidad de la habitación: ${habitacionParaCapacidad.capacidad_maxima}`
                    : undefined
                }
                required
              />


            </div>


            {/* =================================================
                TOTAL
            ================================================= */}

            {isAdmin ? (

              <div className="field">

                <label>
                  VALOR TOTAL
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    f.valor_total
                  }
                  onChange={e =>
                    setF({
                      ...f,
                      valor_total:
                        e.target.value
                    })
                  }
                  required
                />

              </div>

            ) : (

              <div
                className="field reservation-total-field"
                style={{
                  gridColumn:
                    '1 / -1',
                  width:
                    '100%',
                  minWidth:
                    0,
                  padding:
                    '16px 18px',
                  borderRadius:
                    '16px',
                  border:
                    '1px solid rgba(229,193,88,.22)',
                  background:
                    'linear-gradient(135deg, rgba(229,193,88,.08), rgba(255,255,255,.025))',
                  boxSizing:
                    'border-box'
                }}
              >

                <label
                  style={{
                    display:
                      'block',
                    marginBottom:
                      '10px'
                  }}
                >
                  VALOR TOTAL
                </label>

                <div
                  className="reservation-total-value"
                  style={{
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    width:
                      '100%',
                    minWidth:
                      0,
                    maxWidth:
                      '100%',
                    padding:
                      '12px 18px',
                    fontSize:
                      'clamp(1.2rem, 3.4vw, 2.35rem)',
                    fontWeight:
                      700,
                    lineHeight:
                      1.2,
                    whiteSpace:
                      'normal',
                    overflowWrap:
                      'anywhere',
                    wordBreak:
                      'break-word',
                    textAlign:
                      'right',
                    borderRadius:
                      '12px',
                    boxSizing:
                      'border-box'
                  }}
                >
                  {money(
                    f.valor_total
                  )}
                </div>

              </div>

            )}


            {/* =================================================
                NOTAS
            ================================================= */}

            <div className="field">

              <label>
                NOTAS
              </label>

              <input
                value={
                  f.notas
                }
                onChange={e =>
                  setF({
                    ...f,
                    notas:
                      e.target.value
                  })
                }
                placeholder="Solicitud especial…"
              />

            </div>


            <div className="form-actions reservation-submit">

              <button
                className="primary"
                type="submit"
              >
                Crear reserva →
              </button>

            </div>

          </form>

        </div>


        {msg && (

          <div className="notice">
            {msg}
          </div>

        )}



      </section>


      {/* =========================================================
          MODAL SELECTOR DE HABITACIONES
      ========================================================= */}

      {mostrarSelectorHabitacion && isAdmin && (

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="selector-habitaciones-titulo"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setMostrarSelectorHabitacion(false);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'rgba(2,5,14,0.84)',
            backdropFilter: 'blur(9px)',
            boxSizing: 'border-box'
          }}
        >

          <div
            style={{
              width: 'min(900px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '24px',
              borderRadius: '18px',
              border: '1px solid rgba(229,193,88,0.22)',
              background: 'linear-gradient(145deg,#101523,#070a14)',
              boxShadow: '0 30px 90px rgba(0,0,0,.58)',
              boxSizing: 'border-box'
            }}
          >

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '20px'
              }}
            >
              <div>
                <div
                  style={{
                    color: '#e5c158',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    marginBottom: '6px'
                  }}
                >
                  PAIE ROYALE · NUEVA RESERVA
                </div>
                <h2
                  id="selector-habitaciones-titulo"
                  style={{
                    margin: 0,
                    color: '#fff',
                    fontSize: '24px'
                  }}
                >
                  Seleccionar habitación
                </h2>
                <p
                  style={{
                    margin: '7px 0 0',
                    color: 'rgba(255,255,255,.52)',
                    fontSize: '13px'
                  }}
                >
                  Busca y selecciona una habitación activa para la reserva.
                </p>
              </div>

              <button
                type="button"
                className="secondary"
                onClick={() => setMostrarSelectorHabitacion(false)}
                aria-label="Cerrar selector de habitaciones"
              >
                ×
              </button>
            </div>

            <div className="module-search" style={{ width: '100%', minWidth: 0, marginBottom: '18px' }}>
              <span className="module-search-icon" aria-hidden="true">⌕</span>
              <input
                type="text"
                value={filtroHabitacion}
                onChange={event => setFiltroHabitacion(event.target.value)}
                placeholder="Buscar por número, tipo o capacidad..."
                autoFocus
                aria-label="Buscar habitación"
                style={{ minHeight: '48px', boxSizing: 'border-box' }}
              />
              {filtroHabitacion && <button type="button" className="module-search-clear" onClick={() => setFiltroHabitacion('')} aria-label="Limpiar búsqueda">×</button>}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                gap: '15px',
                flexWrap: 'wrap'
              }}
            >
              <span
                style={{
                  color: 'rgba(255,255,255,0.52)',
                  fontSize: '13px'
                }}
              >
                {habitacionesFiltradas.length}{' '}
                {habitacionesFiltradas.length === 1
                  ? 'habitación encontrada'
                  : 'habitaciones encontradas'}
              </span>

              <span
                style={{
                  color: '#e5c158',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                Solo habitaciones activas
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gap: '9px',
                maxHeight: habitacionesFiltradas.length > 10 ? '620px' : 'none',
                overflowY: 'auto',
                paddingRight: habitacionesFiltradas.length > 10 ? '4px' : 0,
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(148,163,184,.20) transparent'
              }}
            >
              {habitacionesFiltradas.map(room => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    setF(previous => ({
                      ...previous,
                      id_habitacion: String(room.id),
                      numero_personas: Number(room.capacidad_maxima || previous.numero_personas || 1)
                    }));
                    setMostrarSelectorHabitacion(false);
                    setFiltroHabitacion('');
                  }}
                  style={{
                    width: '100%',
                    minHeight: '76px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: String(f.id_habitacion) === String(room.id)
                      ? '1px solid rgba(229,193,88,0.55)'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: String(f.id_habitacion) === String(room.id)
                      ? 'rgba(229,193,88,0.10)'
                      : 'rgba(255,255,255,0.035)',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '15px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Habitación #{room.numero_habitacion}
                    </div>

                    <div
                      style={{
                        color: 'rgba(255,255,255,0.52)',
                        fontSize: '12px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {room.tipo_habitacion || 'Habitación'}
                      {' · '}
                      Capacidad: {room.capacidad_maxima || '—'} personas
                      {' · '}
                      {money(room.tarifa)} / noche
                    </div>
                  </div>

                  <div
                    style={{
                      flex: '0 0 auto',
                      color: '#e5c158',
                      fontSize: String(f.id_habitacion) === String(room.id) ? '12px' : '22px',
                      fontWeight: 700
                    }}
                  >
                    {String(f.id_habitacion) === String(room.id)
                      ? 'Seleccionada'
                      : '›'}
                  </div>
                </button>
              ))}

              {!habitacionesFiltradas.length && (
                <div
                  style={{
                    padding: '35px 20px',
                    textAlign: 'center',
                    borderRadius: '13px',
                    border: '1px dashed rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.52)'
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      color: '#fff',
                      marginBottom: '6px'
                    }}
                  >
                    No se encontraron habitaciones
                  </strong>
                  <span style={{ fontSize: '13px' }}>
                    Prueba con otro número, tipo o capacidad.
                  </span>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: '22px',
                paddingTop: '18px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={() => setMostrarSelectorHabitacion(false)}
                style={{
                  minHeight: '46px',
                  minWidth: '120px',
                  borderRadius: '10px'
                }}
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}


      {/* =========================================================
          MODAL SELECTOR DE CLIENTES
      ========================================================= */}

      {mostrarSelectorCliente && (

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="selector-clientes-titulo"

          onMouseDown={event => {

            if (
              event.target ===
              event.currentTarget
            ) {
              setMostrarSelectorCliente(
                false
              );
            }

          }}

          style={{
            position:
              'fixed',
            inset:
              0,
            zIndex:
              1900,
            display:
              'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            padding:
              '20px',
            background:
              'rgba(2,5,14,0.84)',
            backdropFilter:
              'blur(9px)',
            boxSizing:
              'border-box'
          }}
        >

          <div
            style={{
              width:
                'min(900px, 100%)',
              maxHeight:
                'calc(100vh - 40px)',
              overflowY:
                'auto',
              borderRadius:
                '20px',
              padding:
                '28px',
              background:
                'linear-gradient(145deg, rgba(15,20,34,0.99), rgba(5,9,18,0.99))',
              border:
                '1px solid rgba(229,193,88,0.28)',
              boxShadow:
                '0 28px 80px rgba(0,0,0,0.58)',
              boxSizing:
                'border-box'
            }}
          >

            <div
              style={{
                display:
                  'flex',
                alignItems:
                  'flex-start',
                justifyContent:
                  'space-between',
                gap:
                  '20px',
                marginBottom:
                  '24px'
              }}
            >

              <div>

                <div
                  style={{
                    color:
                      '#e5c158',
                    fontSize:
                      '12px',
                    fontWeight:
                      800,
                    letterSpacing:
                      '0.12em',
                    textTransform:
                      'uppercase',
                    marginBottom:
                      '7px'
                  }}
                >
                  PAIE ROYALE · NUEVA RESERVA
                </div>

                <h2
                  id="selector-clientes-titulo"
                  style={{
                    margin:
                      0,
                    color:
                      '#fff',
                    fontSize:
                      'clamp(24px, 4vw, 30px)',
                    lineHeight:
                      1.2
                  }}
                >
                  Seleccionar cliente
                </h2>

                <p
                  style={{
                    margin:
                      '9px 0 0',
                    color:
                      'rgba(255,255,255,0.58)',
                    fontSize:
                      '14px'
                  }}
                >
                  Selecciona un cliente activo
                  para esta reserva.
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setMostrarSelectorCliente(
                    false
                  )
                }
                aria-label="Cerrar selector de clientes"

                style={{
                  flex:
                    '0 0 auto',
                  width:
                    '46px',
                  height:
                    '46px',
                  borderRadius:
                    '12px',
                  border:
                    '1px solid rgba(229,193,88,0.25)',
                  background:
                    'rgba(255,255,255,0.045)',
                  color:
                    '#fff',
                  cursor:
                    'pointer',
                  fontSize:
                    '24px',
                  fontWeight:
                    700,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center'
                }}
              >
                ×
              </button>

            </div>


            <div
              className="field"
              style={{
                marginBottom:
                  '18px'
              }}
            >

              <label>
                BUSCAR CLIENTE
              </label>

              <input
                type="text"
                value={
                  filtroCliente
                }
                onChange={e =>
                  setFiltroCliente(
                    e.target.value
                  )
                }
                placeholder="Escribe el nombre, apellido o correo..."
                autoFocus

                style={{
                  width:
                    '100%',
                  minHeight:
                    '52px',
                  padding:
                    '0 15px',
                  borderRadius:
                    '11px',
                  boxSizing:
                    'border-box'
                }}
              />

            </div>


            <div
              style={{
                marginBottom:
                  '20px'
              }}
            >

              <div
                style={{
                  color:
                    'rgba(255,255,255,0.72)',
                  fontSize:
                    '12px',
                  fontWeight:
                    800,
                  letterSpacing:
                    '0.07em',
                  marginBottom:
                    '10px'
                }}
              >
                FILTRAR POR LETRA
              </div>


              <div
                style={{
                  display:
                    'flex',
                  flexWrap:
                    'wrap',
                  gap:
                    '7px'
                }}
              >

                {[
                  'TODOS',
                  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                ].map(
                  letra => {

                    const activa =
                      letraCliente ===
                      letra;

                    return (

                      <button
                        key={letra}
                        type="button"
                        onClick={() =>
                          setLetraCliente(
                            letra
                          )
                        }

                        style={{
                          minWidth:
                            letra === 'TODOS'
                              ? '64px'
                              : '36px',
                          height:
                            '36px',
                          padding:
                            letra === 'TODOS'
                              ? '0 10px'
                              : '0',
                          borderRadius:
                            '9px',
                          border:
                            activa
                              ? '1px solid rgba(229,193,88,0.75)'
                              : '1px solid rgba(255,255,255,0.10)',
                          background:
                            activa
                              ? 'rgba(229,193,88,0.16)'
                              : 'rgba(255,255,255,0.04)',
                          color:
                            activa
                              ? '#e5c158'
                              : 'rgba(255,255,255,0.72)',
                          cursor:
                            'pointer',
                          fontWeight:
                            800,
                          fontSize:
                            '12px'
                        }}
                      >
                        {letra}
                      </button>

                    );

                  }
                )}

              </div>

            </div>


            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                marginBottom:
                  '12px',
                gap:
                  '15px',
                flexWrap:
                  'wrap'
              }}
            >

              <span
                style={{
                  color:
                    'rgba(255,255,255,0.52)',
                  fontSize:
                    '13px'
                }}
              >
                {clientesFiltrados.length}{' '}

                {clientesFiltrados.length === 1
                  ? 'cliente encontrado'
                  : 'clientes encontrados'}
              </span>

              <span
                style={{
                  color:
                    '#e5c158',
                  fontSize:
                    '12px',
                  fontWeight:
                    700
                }}
              >
                Solo clientes activos
              </span>

            </div>


            <div
              style={{
                display:
                  'grid',
                gap:
                  '9px'
              }}
            >

              {clientesFiltrados.map(
                cliente => (

                  <button
                    key={cliente.id}
                    type="button"

                    onClick={() => {

                      setF(previous => ({
                        ...previous,

                        id_cliente:
                          String(
                            cliente.id
                          )
                      }));

                      setMostrarSelectorCliente(
                        false
                      );

                      setFiltroCliente(
                        ''
                      );

                      setLetraCliente(
                        'TODOS'
                      );

                    }}

                    style={{
                      width:
                        '100%',
                      minHeight:
                        '68px',
                      padding:
                        '12px 16px',
                      borderRadius:
                        '12px',
                      border:
                        String(
                          f.id_cliente
                        ) ===
                        String(
                          cliente.id
                        )
                          ? '1px solid rgba(229,193,88,0.55)'
                          : '1px solid rgba(255,255,255,0.08)',
                      background:
                        String(
                          f.id_cliente
                        ) ===
                        String(
                          cliente.id
                        )
                          ? 'rgba(229,193,88,0.10)'
                          : 'rgba(255,255,255,0.035)',
                      color:
                        '#fff',
                      cursor:
                        'pointer',
                      textAlign:
                        'left',
                      display:
                        'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'space-between',
                      gap:
                        '15px',
                      boxSizing:
                        'border-box'
                    }}
                  >

                    <div
                      style={{
                        minWidth:
                          0
                      }}
                    >

                      <div
                        style={{
                          fontSize:
                            '15px',
                          fontWeight:
                            800,
                          marginBottom:
                            '4px',
                          overflow:
                            'hidden',
                          textOverflow:
                            'ellipsis',
                          whiteSpace:
                            'nowrap'
                        }}
                      >
                        {cliente.nombre}{' '}
                        {cliente.apellido || ''}
                      </div>

                      <div
                        style={{
                          color:
                            'rgba(255,255,255,0.52)',
                          fontSize:
                            '12px',
                          overflow:
                            'hidden',
                          textOverflow:
                            'ellipsis',
                          whiteSpace:
                            'nowrap'
                        }}
                      >
                        {cliente.correo ||
                          'Sin correo'}
                      </div>

                    </div>


                    <div
                      style={{
                        flex:
                          '0 0 auto',
                        color:
                          '#e5c158',
                        fontSize:
                          '22px',
                        fontWeight:
                          700
                      }}
                    >
                      {String(
                        f.id_cliente
                      ) ===
                      String(
                        cliente.id
                      )
                        ? 'Seleccionado'
                        : '›'}
                    </div>

                  </button>

                )
              )}


              {!clientesFiltrados.length && (

                <div
                  style={{
                    padding:
                      '35px 20px',
                    textAlign:
                      'center',
                    borderRadius:
                      '13px',
                    border:
                      '1px dashed rgba(255,255,255,0.12)',
                    color:
                      'rgba(255,255,255,0.52)'
                  }}
                >

                  <strong
                    style={{
                      display:
                        'block',
                      color:
                        '#fff',
                      marginBottom:
                        '6px'
                    }}
                  >
                    No se encontraron clientes
                  </strong>

                  <span
                    style={{
                      fontSize:
                        '13px'
                    }}
                  >
                    Prueba con otra letra o
                    modifica la búsqueda.
                  </span>

                </div>

              )}

            </div>


            <div
              style={{
                marginTop:
                  '22px',
                paddingTop:
                  '18px',
                borderTop:
                  '1px solid rgba(255,255,255,0.08)',
                display:
                  'flex',
                justifyContent:
                  'flex-end'
              }}
            >

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setMostrarSelectorCliente(
                    false
                  )
                }

                style={{
                  minHeight:
                    '46px',
                  minWidth:
                    '120px',
                  borderRadius:
                    '10px',
                  fontWeight:
                    800
                }}
              >
                Cerrar
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =========================================================
          MODAL EDITAR RESERVA
      ========================================================= */}

      {reservaEditando && (

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="editar-reserva-titulo"

          onMouseDown={event => {

            if (
              event.target ===
              event.currentTarget
            ) {
              cerrarEdicion();
            }

          }}

          style={{
            position:
              'fixed',
            inset:
              0,
            zIndex:
              2000,
            display:
              'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            padding:
              '20px',
            background:
              'rgba(2,5,14,0.84)',
            backdropFilter:
              'blur(9px)',
            boxSizing:
              'border-box'
          }}
        >

          <div
            style={{
              width:
                'min(920px, 100%)',
              maxHeight:
                'calc(100vh - 40px)',
              overflowY:
                'auto',
              borderRadius:
                '20px',
              padding:
                '28px',
              background:
                'linear-gradient(145deg, rgba(15,20,34,0.99), rgba(5,9,18,0.99))',
              border:
                '1px solid rgba(229,193,88,0.28)',
              boxShadow:
                '0 28px 80px rgba(0,0,0,0.58)',
              boxSizing:
                'border-box'
            }}
          >

            <div
              style={{
                display:
                  'flex',
                alignItems:
                  'flex-start',
                justifyContent:
                  'space-between',
                gap:
                  '20px',
                marginBottom:
                  '26px'
              }}
            >

              <div>

                <div
                  style={{
                    color:
                      '#e5c158',
                    fontSize:
                      '12px',
                    fontWeight:
                      800,
                    letterSpacing:
                      '0.12em',
                    textTransform:
                      'uppercase',
                    marginBottom:
                      '7px'
                  }}
                >
                  PAIE ROYALE · RESERVAS
                </div>

                <h2
                  id="editar-reserva-titulo"
                  style={{
                    margin:
                      0,
                    color:
                      '#fff',
                    fontSize:
                      'clamp(24px, 4vw, 30px)',
                    lineHeight:
                      1.2
                  }}
                >
                  Editar reserva
                </h2>

              </div>


              <button
                type="button"
                onClick={
                  cerrarEdicion
                }
                aria-label="Cerrar edición"

                style={{
                  flex:
                    '0 0 auto',
                  width:
                    '46px',
                  height:
                    '46px',
                  borderRadius:
                    '12px',
                  border:
                    '1px solid rgba(229,193,88,0.25)',
                  background:
                    'rgba(255,255,255,0.045)',
                  color:
                    '#fff',
                  cursor:
                    'pointer',
                  fontSize:
                    '24px',
                  fontWeight:
                    700,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  transition:
                    'all 0.2s ease'
                }}
              >
                ×
              </button>

            </div>


            <div
              style={{
                marginBottom:
                  '24px',
                padding:
                  '13px 16px',
                borderRadius:
                  '11px',
                background:
                  'rgba(229,193,88,0.055)',
                border:
                  '1px solid rgba(229,193,88,0.13)'
              }}
            >

              <span
                style={{
                  color:
                    'rgba(255,255,255,0.48)',
                  fontSize:
                    '12px',
                  marginRight:
                    '7px'
                }}
              >
                Reserva:
              </span>

              <strong
                style={{
                  color:
                    '#e5c158',
                  fontSize:
                    '14px'
                }}
              >
                {reservaEditando.numero_confirmacion}
              </strong>

            </div>


            <form
              onSubmit={
                guardarEdicion
              }
            >

              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gap:
                    '20px'
                }}
              >

                <div
                  style={{
                    gridColumn:
                      '1 / -1'
                  }}
                >

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '8px',
                      color:
                        'rgba(255,255,255,0.72)',
                      fontSize:
                        '12px',
                      fontWeight:
                        800,
                      letterSpacing:
                        '0.07em'
                    }}
                  >
                    CLIENTE
                  </label>

                  <select
                    value={
                      editForm.id_cliente
                    }
                    onChange={e =>
                      setEditForm(
                        previous => ({
                          ...previous,
                          id_cliente:
                            e.target.value
                        })
                      )
                    }
                    required

                    style={{
                      width:
                        '100%',
                      minHeight:
                        '52px',
                      padding:
                        '0 15px',
                      borderRadius:
                        '11px',
                      boxSizing:
                        'border-box'
                    }}
                  >

                    <option value="">
                      Seleccionar cliente
                    </option>

                    {clientes.map(
                      c => (

                        <option
                          key={c.id}
                          value={c.id}
                        >
                          {c.nombre}{' '}
                          {c.apellido}
                          {' — '}
                          {c.correo}
                        </option>

                      )
                    )}

                  </select>

                </div>


                <div
                  style={{
                    gridColumn:
                      '1 / -1'
                  }}
                >

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '8px',
                      color:
                        'rgba(255,255,255,0.72)',
                      fontSize:
                        '12px',
                      fontWeight:
                        800,
                      letterSpacing:
                        '0.07em'
                    }}
                  >
                    HABITACIÓN
                  </label>

                  <select
                    value={
                      editForm.id_habitacion
                    }
                    onChange={e => {

                      const room =
                        habitaciones.find(
                          item =>
                            String(item.id) ===
                            String(
                              e.target.value
                            )
                        );

                      setEditForm(
                        previous => ({
                          ...previous,
                          id_habitacion:
                            e.target.value,
                          numero_personas:
                            room?.capacidad_maxima
                              ? Number(
                                  room.capacidad_maxima
                                )
                              : previous.numero_personas
                        })
                      );

                    }}
                    required

                    style={{
                      width:
                        '100%',
                      minHeight:
                        '52px',
                      padding:
                        '0 15px',
                      borderRadius:
                        '11px',
                      boxSizing:
                        'border-box'
                    }}
                  >

                    <option value="">
                      Seleccionar habitación
                    </option>

                    {habitaciones.map(
                      room => (

                        <option
                          key={room.id}
                          value={room.id}
                        >
                          #{room.numero_habitacion}
                          {' · '}
                          {room.tipo_habitacion}
                          {' · '}
                          {money(
                            room.tarifa
                          )}
                          {' / noche'}
                        </option>

                      )
                    )}

                  </select>

                </div>


                <div>

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '8px',
                      color:
                        'rgba(255,255,255,0.72)',
                      fontSize:
                        '12px',
                      fontWeight:
                        800,
                      letterSpacing:
                        '0.07em'
                    }}
                  >
                    FECHA Y HORA DE ENTRADA
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      editForm.fecha_inicio
                    }
                    onChange={e =>
                      setEditForm(
                        previous => ({
                          ...previous,
                          fecha_inicio:
                            e.target.value
                        })
                      )
                    }
                    required

                    style={{
                      width:
                        '100%',
                      minHeight:
                        '52px',
                      padding:
                        '0 14px',
                      borderRadius:
                        '11px',
                      boxSizing:
                        'border-box'
                    }}
                  />

                </div>


                <div>

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '8px',
                      color:
                        'rgba(255,255,255,0.72)',
                      fontSize:
                        '12px',
                      fontWeight:
                        800,
                      letterSpacing:
                        '0.07em'
                    }}
                  >
                    FECHA Y HORA DE SALIDA
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      editForm.fecha_fin
                    }
                    onChange={e =>
                      setEditForm(
                        previous => ({
                          ...previous,
                          fecha_fin:
                            e.target.value
                        })
                      )
                    }
                    required

                    style={{
                      width:
                        '100%',
                      minHeight:
                        '52px',
                      padding:
                        '0 14px',
                      borderRadius:
                        '11px',
                      boxSizing:
                        'border-box'
                    }}
                  />

                </div>


                <div>

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '8px',
                      color:
                        'rgba(255,255,255,0.72)',
                      fontSize:
                        '12px',
                      fontWeight:
                        800,
                      letterSpacing:
                        '0.07em'
                    }}
                  >
                    PERSONAS
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      editForm.numero_personas
                    }
                    onChange={e =>
                      setEditForm(
                        previous => ({
                          ...previous,
                          numero_personas:
                            e.target.value
                        })
                      )
                    }
                    required

                    style={{
                      width:
                        '100%',
                      minHeight:
                        '52px',
                      padding:
                        '0 14px',
                      borderRadius:
                        '11px',
                      boxSizing:
                        'border-box'
                    }}
                  />

                </div>


                <div>

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '8px',
                      color:
                        'rgba(255,255,255,0.72)',
                      fontSize:
                        '12px',
                      fontWeight:
                        800,
                      letterSpacing:
                        '0.07em'
                    }}
                  >
                    NOTAS
                  </label>

                  <input
                    value={
                      editForm.notas
                    }
                    onChange={e =>
                      setEditForm(
                        previous => ({
                          ...previous,
                          notas:
                            e.target.value
                        })
                      )
                    }
                    placeholder="Solicitud especial…"

                    style={{
                      width:
                        '100%',
                      minHeight:
                        '52px',
                      padding:
                        '0 14px',
                      borderRadius:
                        '11px',
                      boxSizing:
                        'border-box'
                    }}
                  />

                </div>

              </div>


              <div
                style={{
                  height:
                    '1px',
                  margin:
                    '28px 0 20px',
                  background:
                    'rgba(255,255,255,0.08)'
                }}
              />


              <div
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'flex-end',
                  alignItems:
                    'center',
                  gap:
                    '12px',
                  flexWrap:
                    'wrap'
                }}
              >

                <button
                  type="button"
                  className="secondary"
                  onClick={
                    cerrarEdicion
                  }

                  style={{
                    minHeight:
                      '50px',
                    minWidth:
                      '130px',
                    padding:
                      '0 20px',
                    borderRadius:
                      '11px',
                    fontSize:
                      '14px',
                    fontWeight:
                      800
                  }}
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  className="primary"

                  style={{
                    minHeight:
                      '50px',
                    minWidth:
                      '190px',
                    padding:
                      '0 24px',
                    borderRadius:
                      '11px',
                    fontSize:
                      '15px',
                    fontWeight:
                      800,
                    boxShadow:
                      '0 8px 22px rgba(229,193,88,0.18)'
                  }}
                >
                  Guardar cambios
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </>

  );
}


/* =========================================================
   HELPER SEGURO PARA HABITACIÓN
========================================================= */

function selectedRoomSafe(
  habitaciones = [],
  idHabitacion
) {

  if (
    !idHabitacion
  ) {
    return null;
  }

  return habitaciones.find(
    room =>
      String(room.id) ===
      String(idHabitacion)
  ) || null;
}