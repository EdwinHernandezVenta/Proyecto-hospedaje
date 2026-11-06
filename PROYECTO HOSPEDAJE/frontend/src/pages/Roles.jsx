import { useEffect, useMemo, useRef, useState } from 'react';
import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch
} from '../api/api';

import './Roles.css';
import { useDialog } from '../components/AppDialog';

const ROLES_DISPONIBLES = [
  'Administrador',
  'Cliente'
];

const PERMISOS = [
  {
    nombre: 'ver',
    descripcion: 'Consultar información'
  },
  {
    nombre: 'crear',
    descripcion: 'Crear registros'
  },
  {
    nombre: 'editar',
    descripcion: 'Editar registros'
  },
  {
    nombre: 'eliminar',
    descripcion: 'Eliminar registros'
  },
  {
    nombre: 'exportar',
    descripcion: 'Exportar información'
  },
  {
    nombre: 'confirmar_pago',
    descripcion: 'Confirmar o rechazar pagos'
  },
  {
    nombre: 'gestionar_roles',
    descripcion: 'Gestionar roles y permisos'
  },
  {
    nombre: 'gestionar_usuarios',
    descripcion: 'Gestionar usuarios'
  },
  {
    nombre: 'gestionar_reservas',
    descripcion: 'Gestionar reservas'
  }
];

function normalizarBooleano(valor) {
  if (
    valor === true ||
    valor === 1 ||
    valor === '1' ||
    valor === 'true' ||
    valor === 'TRUE' ||
    valor === 'activo' ||
    valor === 'Activo' ||
    valor === 'ACTIVO' ||
    valor === 'active' ||
    valor === 'Active' ||
    valor === 'ACTIVE'
  ) {
    return true;
  }

  return false;
}

function normalizarPermisos(valor) {
  if (!valor) {
    return [];
  }

  if (Array.isArray(valor)) {
    return valor;
  }

  if (typeof valor === 'string') {
    try {
      const resultado = JSON.parse(valor);

      if (Array.isArray(resultado)) {
        return resultado;
      }
    } catch {
      return valor
        .split(',')
        .map((permiso) => permiso.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export default function Roles() {
  const { notify, confirmDialog } = useDialog();
  const [roles, setRoles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  const [modal, setModal] = useState(null);

  const [nombre, setNombre] = useState('Cliente');
  const [permisos, setPermisos] = useState([]);
  const [estado, setEstado] = useState(true);

  const [detalle, setDetalle] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] =
    useState(false);

  // Paginación y búsqueda de usuarios/clientes asociados al rol.
  // La lógica del rol se mantiene; solo se mejora la forma de presentar
  // listas grandes sin hacer crecer indefinidamente el modal.
  const [usuariosPagina, setUsuariosPagina] = useState(1);
  const [usuariosBusqueda, setUsuariosBusqueda] = useState('');
  const [usuariosBusquedaAplicada, setUsuariosBusquedaAplicada] = useState('');
  const [usuariosTotal, setUsuariosTotal] = useState(0);
  const [usuariosLimite] = useState(5);
  const usuariosSolicitudRef = useRef(0);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [moduleNotice, setModuleNotice] = useState(null);
  const [moduleConfirm, setModuleConfirm] = useState(null);
  const [moduleConfirmando, setModuleConfirmando] = useState(false);

  async function cargarRoles() {
    try {
      setCargando(true);

      const respuesta = await apiGet('/roles');

      setRoles(
        Array.isArray(respuesta)
          ? respuesta
          : []
      );
    } catch (error) {
      console.error(error);

      notify(error?.message ||
        'No fue posible cargar los roles', { type: 'error', title: 'No se pudieron cargar los roles' });
    } finally {
      setCargando(false);
    }
  }

  async function cargarModulos() {
    try {
      const respuesta =
        await apiGet('/roles/modulos');

      setModulos(
        Array.isArray(respuesta)
          ? respuesta
          : []
      );
    } catch (error) {
      console.error(error);

      notify(error?.message ||
        'No fue posible cargar los módulos', { type: 'error', title: 'No se pudieron cargar los módulos' });
    }
  }

  async function cargarDetalle(
    id,
    pagina = 1,
    busquedaUsuarios = '',
    limpiarDetalle = true
  ) {
    try {
      setCargandoDetalle(true);

      if (limpiarDetalle) {
        setDetalle(null);
      }

      const parametros = new URLSearchParams({
        page: String(pagina),
        limit: String(usuariosLimite),
        search: busquedaUsuarios
      });

      const [respuesta, asignados] = await Promise.all([
        apiGet(`/roles/${id}`),
        apiGet(`/roles/${id}/asignados?${parametros.toString()}`)
      ]);

      setDetalle({
        ...respuesta,
        usuarios: Array.isArray(asignados?.rows)
          ? asignados.rows
          : [],
        usuarios_total: Number(asignados?.total || 0),
        usuarios_pagina: Number(asignados?.pagina || pagina),
        usuarios_limite: Number(asignados?.limite || usuariosLimite),
        usuarios_total_paginas: Number(asignados?.total_paginas || 1),
        usuarios_tipo: asignados?.tipo || ''
      });

      setUsuariosPagina(Number(asignados?.pagina || pagina));
      setUsuariosTotal(Number(asignados?.total || 0));
    } catch (error) {
      console.error(error);

      notify(error?.message ||
        'No fue posible cargar el detalle del rol', { type: 'error', title: 'No se pudo cargar el detalle' });

      setModal(null);
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function cargarUsuariosDetalle(
    id,
    pagina,
    busquedaUsuarios = usuariosBusquedaAplicada
  ) {
    if (!id) {
      return;
    }

    const solicitud = ++usuariosSolicitudRef.current;

    try {
      setCargandoUsuarios(true);

      const parametros = new URLSearchParams({
        page: String(pagina),
        limit: String(usuariosLimite),
        search: busquedaUsuarios
      });

      const respuesta = await apiGet(
        `/roles/${id}/asignados?${parametros.toString()}`
      );

      if (solicitud !== usuariosSolicitudRef.current) {
        return;
      }

      setDetalle((actual) => {
        if (!actual) {
          return actual;
        }

        return {
          ...actual,
          usuarios: Array.isArray(respuesta?.rows)
            ? respuesta.rows
            : [],
          usuarios_total: Number(respuesta?.total || 0),
          usuarios_pagina: Number(respuesta?.pagina || pagina),
          usuarios_limite: Number(respuesta?.limite || usuariosLimite),
          usuarios_total_paginas: Number(respuesta?.total_paginas || 1),
          usuarios_tipo: respuesta?.tipo || ''
        };
      });

      setUsuariosPagina(Number(respuesta?.pagina || pagina));
      setUsuariosTotal(Number(respuesta?.total || 0));
    } catch (error) {
      console.error(error);

      notify(error?.message ||
        'No fue posible cargar los usuarios asociados', { type: 'error', title: 'No se pudo actualizar la lista' });
    } finally {
      if (solicitud === usuariosSolicitudRef.current) {
        setCargandoUsuarios(false);
      }
    }
  }

  useEffect(() => {
    cargarRoles();
  }, []);

  function abrirCrear() {
    setNombre('Cliente');
    setPermisos(['ver']);
    setEstado(true);
    setModal('crear');
  }

  async function abrirEditar(rol) {
    setModuleNotice(null);
    setModuleConfirm(null);
    setModuleConfirmando(false);
    setNombre(
      ROLES_DISPONIBLES.includes(
        rol.nombre_rol
      )
        ? rol.nombre_rol
        : 'Cliente'
    );

    setPermisos(
      normalizarPermisos(
        rol.permisos_lista ?? rol.permisos
      )
    );

    setEstado(
      normalizarBooleano(
        rol.estado_rol
      )
    );

    setDetalle(null);
    setModal({
      tipo: 'editar',
      id: rol.id
    });

    // Cargamos los módulos existentes para que Editar conserve
    // la administración de módulos que ya funciona en el sistema.
    await Promise.all([
      cargarDetalle(rol.id, 1, ''),
      cargarModulos()
    ]);
  }

  function cambiarPermiso(nombrePermiso) {
    setPermisos((actuales) => {
      if (actuales.includes(nombrePermiso)) {
        return actuales.filter(
          (permiso) =>
            permiso !== nombrePermiso
        );
      }

      return [
        ...actuales,
        nombrePermiso
      ];
    });
  }

  async function crear() {
    if (!nombre) {
      notify('Debes seleccionar un nombre de rol', { type: 'warning', title: 'Falta el nombre del rol' });
      return;
    }

    const confirmar = await confirmDialog(
      `¿Deseas crear el rol "${nombre}"?`,
      { title: 'Crear rol', confirmText: 'Crear rol', cancelText: 'Cancelar' }
    );

    if (!confirmar) {
      return;
    }

    try {
      await apiPost('/roles', {
        nombre_rol: nombre,
        permisos,
        estado_rol: estado
      });

      setModal(null);

      await cargarRoles();

      notify('Rol creado correctamente', { type: 'success', title: 'Rol creado' });
    } catch (error) {
      console.error(error);

      notify(error?.message || 'No fue posible crear el rol', { type: 'error', title: 'No se pudo crear el rol' });
    }
  }

  async function guardarEdicion() {
    if (!modal?.id) {
      return;
    }

    if (!nombre) {
      notify('Debes seleccionar un nombre de rol', { type: 'warning', title: 'Falta el nombre del rol' });
      return;
    }

    const confirmar = await confirmDialog(
      `¿Guardar los cambios del rol "${nombre}"?`,
      { title: 'Guardar cambios', confirmText: 'Guardar', cancelText: 'Cancelar' }
    );

    if (!confirmar) {
      return;
    }

    try {
      await apiPut(
        `/roles/${modal.id}`,
        {
          nombre_rol: nombre,
          permisos,
          estado_rol: estado
        }
      );

      setModal(null);

      await cargarRoles();

      notify('Rol actualizado correctamente', { type: 'success', title: 'Rol actualizado' });
    } catch (error) {
      console.error(error);

      notify(error?.message || 'No fue posible actualizar el rol', { type: 'error', title: 'No se pudo actualizar el rol' });
    }
  }

  async function cambiarEstado(rol) {
    const nuevoEstado =
      !normalizarBooleano(
        rol.estado_rol
      );

    const confirmar = await confirmDialog(
      nuevoEstado
        ? `¿Activar el rol "${rol.nombre_rol}"?`
        : `¿Desactivar el rol "${rol.nombre_rol}"?`,
      { title: nuevoEstado ? 'Activar rol' : 'Desactivar rol', confirmText: nuevoEstado ? 'Activar' : 'Desactivar', cancelText: 'Cancelar' }
    );

    if (!confirmar) {
      return;
    }

    try {
      await apiPatch(
        `/roles/${rol.id}/estado`,
        {
          estado_rol: nuevoEstado
        }
      );

      await cargarRoles();
    } catch (error) {
      console.error(error);

      notify(error?.message || 'No fue posible cambiar el estado', { type: 'error', title: 'No se pudo cambiar el estado' });
    }
  }

  function cambiarModulo(
    modulo,
    activo
  ) {
    if (!detalle?.rol) {
      return;
    }

    setModuleNotice(null);
    setModuleConfirm({
      modulo,
      activo
    });
  }

  async function confirmarCambioModulo() {
    if (!moduleConfirm?.modulo || !detalle?.rol || moduleConfirmando) {
      return;
    }

    const { modulo, activo } = moduleConfirm;

    try {
      setModuleConfirmando(true);

      await apiPatch(
        `/roles/${detalle.rol.id}/modulos/${modulo.id}`,
        {
          estado_permiso: activo
        }
      );

      setModuleConfirm(null);

      await cargarDetalle(
        detalle.rol.id,
        usuariosPagina,
        usuariosBusquedaAplicada,
        false
      );

      await cargarRoles();

      setModuleNotice({
        moduloId: modulo.id,
        type: 'success',
        title: activo ? 'Módulo activado' : 'Módulo desactivado',
        message: activo
          ? `El módulo \"${modulo.nombre_modulo}\" quedó activo para este rol.`
          : `El módulo \"${modulo.nombre_modulo}\" quedó desactivado para este rol.`
      });
    } catch (error) {
      console.error(error);

      setModuleConfirm(null);
      setModuleNotice({
        moduloId: modulo.id,
        type: 'error',
        title: 'No se pudo actualizar el módulo',
        message: error?.message || 'No fue posible actualizar el módulo.'
      });
    } finally {
      setModuleConfirmando(false);
    }
  }

  async function abrirDetalle(rol) {
    setModuleNotice(null);
    setModuleConfirm(null);
    setModuleConfirmando(false);
    setUsuariosPagina(1);
    setUsuariosBusqueda('');
    setUsuariosBusquedaAplicada('');
    setUsuariosTotal(Number(rol.usuarios_asignados || 0));
    setModal('detalle');

    await Promise.all([
      cargarDetalle(rol.id, 1, ''),
      cargarModulos()
    ]);
  }

  useEffect(() => {
    if (modal !== 'detalle' || !detalle?.rol?.id) {
      return undefined;
    }

    const texto = usuariosBusqueda.trim();
    const temporizador = setTimeout(async () => {
      setUsuariosBusquedaAplicada(texto);
      setUsuariosPagina(1);

      await cargarUsuariosDetalle(
        detalle.rol.id,
        1,
        texto
      );
    }, 250);

    return () => clearTimeout(temporizador);
  }, [usuariosBusqueda, modal, detalle?.rol?.id]);

  async function cambiarPaginaUsuarios(pagina) {
    const totalPaginas = Number(
      detalle?.usuarios_total_paginas ||
      Math.max(1, Math.ceil(usuariosTotal / usuariosLimite))
    );

    if (
      pagina < 1 ||
      pagina > totalPaginas ||
      pagina === usuariosPagina ||
      !detalle?.rol?.id
    ) {
      return;
    }

    setUsuariosPagina(pagina);

    await cargarUsuariosDetalle(
      detalle.rol.id,
      pagina
    );
  }

  const rolesFiltrados = useMemo(() => {
    const texto =
      busqueda
        .trim()
        .toLowerCase();

    if (!texto) {
      return roles;
    }

    return roles.filter((rol) =>
      String(
        rol.nombre_rol || ''
      )
        .toLowerCase()
        .includes(texto)
    );
  }, [roles, busqueda]);

  return (
    <div className="roles-page">

      <div className="roles-header">

        <div>
          <div className="roles-kicker">
            ADMINISTRACIÓN
          </div>

          <h1>Roles</h1>

          <p>
            Gestiona roles, permisos, estados
            y módulos asociados.
          </p>
        </div>

        <button
          className="roles-primary"
          onClick={abrirCrear}
        >
          + Crear rol
        </button>

      </div>

      <div className="roles-toolbar">

        <div className="roles-toolbar-search">
          <input
            type="text"
            placeholder="Buscar rol..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            aria-label="Buscar rol"
          />
          {busqueda && <button type="button" className="roles-clear-search" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">×</button>}
        </div>

        <span>
          {rolesFiltrados.length} rol(es)
        </span>

      </div>

      <div className="roles-table-container">

        {cargando ? (
          <div className="roles-empty">
            Cargando roles...
          </div>
        ) : rolesFiltrados.length === 0 ? (
          <div className="roles-empty">
            No se encontraron roles.
          </div>
        ) : (
          <table className="roles-table">

            <thead>
              <tr>
                <th>Nombre</th>
                <th>Permisos</th>
                <th>Usuarios</th>
                <th>Módulos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>

              {rolesFiltrados.map((rol) => {

                const activo =
                  normalizarBooleano(
                    rol.estado_rol
                  );

                const permisosRol =
                  normalizarPermisos(
                    rol.permisos_lista ??
                    rol.permisos
                  );

                return (
                  <tr key={rol.id}>

                    <td>
                      <strong>
                        {rol.nombre_rol}
                      </strong>
                    </td>

                    <td>
                      <span className="roles-count">
                        {permisosRol.length}
                      </span>
                    </td>

                    <td>
                      {rol.usuarios_asignados ?? 0}
                    </td>

                    <td>
                      {rol.modulos_asignados ?? 0}
                    </td>

                    <td>

                      <select
                        className={
                          activo
                            ? 'roles-status-select active'
                            : 'roles-status-select inactive'
                        }
                        value={
                          activo
                            ? 'activo'
                            : 'inactivo'
                        }
                        onChange={(event) =>
                          cambiarEstado(
                            rol
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

                    </td>

                    <td>

                      <div className="roles-actions">

                        <button
                          onClick={() =>
                            abrirDetalle(
                              rol
                            )
                          }
                        >
                          Ver
                        </button>

                        <button
                          onClick={() =>
                            abrirEditar(
                              rol
                            )
                          }
                        >
                          Editar
                        </button>

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>
        )}

      </div>

      {/* CREAR */}

      {modal === 'crear' && (
        <div className="roles-modal-backdrop">

          <div className="roles-modal">

            <div className="roles-modal-header">

              <div>
                <span>ROLES</span>
                <h2>
                  Crear rol
                </h2>
              </div>

              <button
                onClick={() =>
                  setModal(null)
                }
              >
                ×
              </button>

            </div>

            <label>
              Nombre del rol
            </label>

            <select
              value={nombre}
              onChange={(event) =>
                setNombre(
                  event.target.value
                )
              }
            >
              {ROLES_DISPONIBLES.map(
                (rol) => (
                  <option
                    key={rol}
                    value={rol}
                  >
                    {rol}
                  </option>
                )
              )}
            </select>

            <label>
              Estado
            </label>

            <select
              value={
                estado
                  ? 'activo'
                  : 'inactivo'
              }
              onChange={(event) =>
                setEstado(
                  event.target.value ===
                  'activo'
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

            <label>
              Permisos
            </label>

            <div className="roles-permissions">

              {PERMISOS.map(
                (permiso) => {

                  const seleccionado =
                    permisos.includes(
                      permiso.nombre
                    );

                  return (
                    <label
                      key={
                        permiso.nombre
                      }
                      className={
                        seleccionado
                          ? 'roles-permission selected'
                          : 'roles-permission'
                      }
                    >

                      <input
                        type="checkbox"
                        checked={
                          seleccionado
                        }
                        onChange={() =>
                          cambiarPermiso(
                            permiso.nombre
                          )
                        }
                      />

                      <span>
                        <strong>
                          {permiso.nombre}
                        </strong>

                      </span>

                    </label>
                  );
                }
              )}

            </div>

            <div className="roles-modal-buttons">

              <button
                className="roles-secondary"
                onClick={() =>
                  setModal(null)
                }
              >
                Cancelar
              </button>

              <button
                className="roles-primary"
                onClick={crear}
              >
                Crear rol
              </button>

            </div>

          </div>

        </div>
      )}

      {/* EDITAR */}

      {modal?.tipo === 'editar' && (
        <div className="roles-modal-backdrop">

          <div className="roles-modal">

            <div className="roles-modal-header">

              <div>
                <span>ROLES</span>

                <h2>
                  Editar rol
                </h2>
              </div>

              <button
                onClick={() =>
                  setModal(null)
                }
              >
                ×
              </button>

            </div>

            <label>
              Nombre del rol
            </label>

            <select
              value={nombre}
              onChange={(event) =>
                setNombre(
                  event.target.value
                )
              }
            >
              {ROLES_DISPONIBLES.map(
                (rol) => (
                  <option
                    key={rol}
                    value={rol}
                  >
                    {rol}
                  </option>
                )
              )}
            </select>

            <label>
              Estado
            </label>

            <select
              value={
                estado
                  ? 'activo'
                  : 'inactivo'
              }
              onChange={(event) =>
                setEstado(
                  event.target.value ===
                  'activo'
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

            <label>
              Permisos
            </label>

            <div className="roles-permissions">

              {PERMISOS.map(
                (permiso) => {

                  const seleccionado =
                    permisos.includes(
                      permiso.nombre
                    );

                  return (
                    <label
                      key={
                        permiso.nombre
                      }
                      className={
                        seleccionado
                          ? 'roles-permission selected'
                          : 'roles-permission'
                      }
                    >

                      <input
                        type="checkbox"
                        checked={
                          seleccionado
                        }
                        onChange={() =>
                          cambiarPermiso(
                            permiso.nombre
                          )
                        }
                      />

                      <span>
                        <strong>
                          {permiso.nombre}
                        </strong>

                      </span>

                    </label>
                  );
                }
              )}

            </div>

            <div className="roles-edit-modules">
              <div className="roles-edit-modules-header">
                <div>
                  <h3 className="roles-subtitle">
                    Módulos asociados
                  </h3>
                </div>
              </div>

              <div className="roles-module-list">
                {!detalle ? (
                  <div className="roles-users-state">
                    Cargando módulos...
                  </div>
                ) : (
                  modulos.map((modulo) => {
                    const asignado = detalle.modulos?.find(
                      (item) => Number(item.id) === Number(modulo.id)
                    );

                    const activo = normalizarBooleano(
                      asignado?.estado_permiso
                    );

                    const confirmandoEsteModulo =
                      moduleConfirm?.modulo &&
                      Number(moduleConfirm.modulo.id) === Number(modulo.id);

                    const avisoEsteModulo =
                      moduleNotice?.moduloId &&
                      Number(moduleNotice.moduloId) === Number(modulo.id);

                    return (
                      <div
                        key={modulo.id}
                        className="roles-module-item"
                      >
                        <label
                          className={
                            activo
                              ? 'roles-module active'
                              : 'roles-module'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={activo}
                            onChange={(event) =>
                              cambiarModulo(
                                modulo,
                                event.target.checked
                              )
                            }
                          />

                          <span>
                            {modulo.nombre_modulo}
                          </span>
                        </label>

                        {confirmandoEsteModulo && (
                          <div
                            className="roles-module-inline-confirm"
                            role="dialog"
                            aria-labelledby={`roles-module-confirm-title-${modulo.id}`}
                          >
                            <div className="roles-module-inline-confirm-icon">
                              !
                            </div>

                            <div className="roles-module-inline-confirm-content">
                              <strong id={`roles-module-confirm-title-${modulo.id}`}>
                                {moduleConfirm.activo
                                  ? 'Activar módulo'
                                  : 'Desactivar módulo'}
                              </strong>
                              <p>
                                {moduleConfirm.activo
                                  ? `¿Activar "${moduleConfirm.modulo.nombre_modulo}" para este rol?`
                                  : `¿Desactivar "${moduleConfirm.modulo.nombre_modulo}" para este rol?`}
                              </p>
                            </div>

                            <div className="roles-module-inline-actions">
                              <button
                                type="button"
                                className="roles-secondary"
                                onClick={() => setModuleConfirm(null)}
                                disabled={moduleConfirmando}
                              >
                                Cancelar
                              </button>

                              <button
                                type="button"
                                className="roles-primary"
                                onClick={confirmarCambioModulo}
                                disabled={moduleConfirmando}
                              >
                                {moduleConfirmando
                                  ? 'Guardando...'
                                  : moduleConfirm.activo
                                    ? 'Activar'
                                    : 'Desactivar'}
                              </button>
                            </div>
                          </div>
                        )}

                        {avisoEsteModulo && (
                          <div
                            className={`roles-module-inline-notice ${moduleNotice.type === 'error' ? 'error' : 'success'}`}
                            role="status"
                          >
                            <div>
                              <strong>{moduleNotice.title}</strong>
                              <span>{moduleNotice.message}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setModuleNotice(null)}
                              aria-label="Cerrar notificación"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="roles-modal-buttons">

              <button
                className="roles-secondary"
                onClick={() =>
                  setModal(null)
                }
              >
                Cancelar
              </button>

              <button
                className="roles-primary"
                onClick={guardarEdicion}
              >
                Guardar cambios
              </button>

            </div>

          </div>

        </div>
      )}

      {/* DETALLE */}

      {modal === 'detalle' && (
        <div className="roles-modal-backdrop">

          <div className="roles-modal roles-modal-large">

            <div className="roles-modal-header">

              <div>

                <span>
                  DETALLE DEL ROL
                </span>

                <h2>
                  {detalle?.rol?.nombre_rol ||
                    'Cargando...'}
                </h2>

              </div>

              <button
                onClick={() =>
                  setModal(null)
                }
              >
                ×
              </button>

            </div>

            {cargandoDetalle ||
            !detalle ? (
              <div className="roles-empty">
                Cargando información...
              </div>
            ) : (
              <>

                <div className="roles-detail-grid">

                  <div>
                    <span>
                      Estado
                    </span>

                    <strong
                      className={
                        detalle.rol.estado_rol
                          ? 'roles-detail-active'
                          : 'roles-detail-inactive'
                      }
                    >
                      {detalle.rol.estado_rol
                        ? 'Activo'
                        : 'Inactivo'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Usuarios
                    </span>

                    <strong>
                      {usuariosTotal}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Módulos
                    </span>

                    <strong>
                      {
                        detalle.modulos?.filter(
                          (modulo) =>
                            normalizarBooleano(
                              modulo.estado_permiso
                            )
                        ).length
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Creado
                    </span>

                    <strong>
                      {detalle.rol.created_at
                        ? new Date(
                            detalle.rol.created_at
                          ).toLocaleDateString(
                            'es-CO'
                          )
                        : '—'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Permisos
                    </span>

                    <strong>
                      {
                        normalizarPermisos(
                          detalle.rol
                            .permisos_lista ??
                          detalle.rol.permisos
                        ).length
                      }
                    </strong>
                  </div>

                </div>

                <h3 className="roles-subtitle">
                  Permisos del rol
                </h3>

                <div className="roles-permission-detail">

                  {PERMISOS.map(
                    (permiso) => {

                      const activos =
                        normalizarPermisos(
                          detalle.rol
                            .permisos_lista ??
                          detalle.rol.permisos
                        );

                      const activo =
                        activos.includes(
                          permiso.nombre
                        );

                      return (
                        <div
                          key={
                            permiso.nombre
                          }
                          className={
                            activo
                              ? 'roles-permission-detail-item active'
                              : 'roles-permission-detail-item'
                          }
                        >
                          <strong>
                            {permiso.nombre}
                          </strong>

                          <span>
                            {permiso.descripcion}
                          </span>

                          <b>
                            {activo
                              ? 'Asignado'
                              : 'No asignado'}
                          </b>
                        </div>
                      );
                    }
                  )}

                </div>

                <h3 className="roles-subtitle">
                  Módulos asociados
                </h3>

                <div className="roles-module-list roles-module-list-view">

                  {modulos.map(
                    (modulo) => {

                      const asignado =
                        detalle.modulos?.find(
                          (item) =>
                            Number(item.id) === Number(modulo.id)
                        );

                      const activo =
                        normalizarBooleano(
                          asignado?.estado_permiso
                        );

                      return (
                        <div
                          key={modulo.id}
                          className={
                            activo
                              ? 'roles-module roles-module-view active'
                              : 'roles-module roles-module-view'
                          }
                        >
                          <span className="roles-module-check" aria-hidden="true">
                            {activo ? '✓' : '—'}
                          </span>

                          <span className="roles-module-content">
                            <strong>{modulo.nombre_modulo}</strong>
                          </span>

                          <span className={activo ? 'roles-module-state active' : 'roles-module-state'}>
                            {activo ? 'Activo' : 'No asignado'}
                          </span>
                        </div>
                      );
                    }
                  )}

                </div>

                <section className="roles-assigned-section">
                  <div className="roles-assigned-header">
                    <div>
                      <h3 className="roles-subtitle">
                        {detalle.rol.nombre_rol === 'Administrador'
                          ? 'Administradores asignados'
                          : 'Clientes asignados'}
                      </h3>
                    </div>

                    <strong className="roles-assigned-total">
                      {usuariosTotal}
                    </strong>
                  </div>

                  <div className="roles-users-search">
                    <input
                      type="text"
                      value={usuariosBusqueda}
                      onChange={(event) =>
                        setUsuariosBusqueda(event.target.value)
                      }
                      placeholder={
                        detalle.rol.nombre_rol === 'Administrador'
                          ? 'Buscar administrador por nombre o correo...'
                          : 'Buscar cliente por nombre o correo...'
                      }
                      aria-label="Buscar usuarios asignados"
                    />

                    {usuariosBusqueda && (
                      <button
                        type="button"
                        className="roles-clear-search"
                        onClick={() => {
                          setUsuariosBusqueda('');
                          setUsuariosBusquedaAplicada('');
                          setUsuariosPagina(1);
                        }}
                        aria-label="Limpiar búsqueda"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className={cargandoUsuarios ? 'roles-users-table-wrap is-loading' : 'roles-users-table-wrap'}>
                    {!detalle.usuarios?.length ? (
                      <div className="roles-users-state">
                        {usuariosBusquedaAplicada
                          ? 'No se encontraron coincidencias.'
                          : 'No hay usuarios asignados a este rol.'}
                      </div>
                    ) : (
                      <div className="roles-users-list">
                        {cargandoUsuarios && (
                          <div className="roles-users-loading">Actualizando lista...</div>
                        )}
                        {detalle.usuarios.map((usuario) => (
                          <div
                            key={usuario.id}
                            className="roles-user-row"
                          >
                            <div className="roles-user-main">
                              <strong>
                                {usuario.nombre_mostrar || usuario.nombre_usuario}
                              </strong>
                              <span className="roles-user-email">
                                {usuario.correo_mostrar || usuario.correo}
                              </span>
                            </div>

                            <span
                              className={
                                normalizarBooleano(usuario.estado_asignado ?? usuario.estado)
                                  ? 'roles-user-status active'
                                  : 'roles-user-status inactive'
                              }
                            >
                              {normalizarBooleano(usuario.estado_asignado ?? usuario.estado)
                                ? 'Activo'
                                : 'Inactivo'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {usuariosTotal > usuariosLimite && (
                    <div className="roles-users-pagination">
                      <button
                        type="button"
                        disabled={usuariosPagina <= 1 || cargandoUsuarios}
                        onClick={() =>
                          cambiarPaginaUsuarios(usuariosPagina - 1)
                        }
                      >
                        Anterior
                      </button>

                      <span>
                        Página {usuariosPagina} de {Number(detalle.usuarios_total_paginas || Math.max(1, Math.ceil(usuariosTotal / usuariosLimite)))}
                      </span>

                      <button
                        type="button"
                        disabled={
                          usuariosPagina >= Number(detalle.usuarios_total_paginas || Math.max(1, Math.ceil(usuariosTotal / usuariosLimite))) ||
                          cargandoUsuarios
                        }
                        onClick={() =>
                          cambiarPaginaUsuarios(usuariosPagina + 1)
                        }
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </section>

              </>
            )}

          </div>

        </div>
      )}

    </div>
  );
}