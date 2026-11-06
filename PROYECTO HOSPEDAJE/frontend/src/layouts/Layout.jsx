import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modulosOcultos, setModulosOcultos] = useState(false);

  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  const cerrarSesion = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('access_token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('jwt');

      navigate('/', { replace: true });
    }
  };

  const esAdministrador = user?.rol === 'Administrador';

  const enlaceClase = ({ isActive }) =>
    `paie-admin-link ${isActive ? 'active' : ''}`;

  return (
    <div className={`paie-admin ${modulosOcultos ? 'paie-modules-collapsed' : ''}`}>

      {/* BOTÓN MENÚ MÓVIL */}
      <button
        type="button"
        className="paie-mobile-menu-button"
        onClick={() => setMenuAbierto(!menuAbierto)}
        aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
      >
        <span className={menuAbierto ? 'line line-1 open' : 'line line-1'} />
        <span className={menuAbierto ? 'line line-2 open' : 'line line-2'} />
        <span className={menuAbierto ? 'line line-3 open' : 'line line-3'} />
      </button>

      {/* FONDO PARA CERRAR EL MENÚ */}
      {menuAbierto && (
        <button
          type="button"
          className="paie-admin-overlay"
          onClick={cerrarMenu}
          aria-label="Cerrar menú"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={
          menuAbierto
            ? 'paie-admin-sidebar open'
            : 'paie-admin-sidebar'
        }
      >

        <div className="paie-admin-brand">
          <div className="paie-admin-brand-mark">
            PR
          </div>

          <div className="paie-admin-brand-text">
            <strong>PAIE ROYALE</strong>
            <span>HOTEL & RESORT</span>
          </div>
        </div>

        <div className="paie-admin-divider" />

        <nav className="paie-admin-nav">

          <div className="paie-admin-nav-title">
            PRINCIPAL
          </div>

          {esAdministrador && (
            <NavLink
              to="/dashboard"
              className={enlaceClase}
              onClick={cerrarMenu}
            >
              <span className="paie-admin-icon">⌂</span>
              <span>Panel de control</span>
            </NavLink>
          )}

          <NavLink
            to="/habitaciones"
            className={enlaceClase}
            onClick={cerrarMenu}
          >
            <span className="paie-admin-icon">▣</span>
            <span>Habitaciones</span>
          </NavLink>

          <NavLink
            to="/reservas"
            className={enlaceClase}
            onClick={cerrarMenu}
          >
            <span className="paie-admin-icon">▤</span>
            <span>Reservas</span>
          </NavLink>

          <NavLink
            to="/pagos"
            className={enlaceClase}
            onClick={cerrarMenu}
          >
            <span className="paie-admin-icon">$</span>
            <span>Pagos</span>
          </NavLink>

          <div className="paie-admin-nav-title">
            GESTIÓN
          </div>

          {esAdministrador && (
            <NavLink
              to="/roles"
              className={enlaceClase}
              onClick={cerrarMenu}
            >
              <span className="paie-admin-icon">♙</span>
              <span>Roles</span>
            </NavLink>
          )}

          {esAdministrador && (
            <NavLink
              to="/usuarios"
              className={enlaceClase}
              onClick={cerrarMenu}
            >
              <span className="paie-admin-icon">♟</span>
              <span>Usuarios</span>
            </NavLink>
          )}

          <NavLink
            to="/servicios"
            className={enlaceClase}
            onClick={cerrarMenu}
          >
            <span className="paie-admin-icon">✦</span>
            <span>Servicios</span>
          </NavLink>

          <NavLink
            to="/paquetes"
            className={enlaceClase}
            onClick={cerrarMenu}
          >
            <span className="paie-admin-icon">◇</span>
            <span>Paquetes</span>
          </NavLink>

          {esAdministrador && (
            <>
              <NavLink
                to="/clientes"
                className={enlaceClase}
                onClick={cerrarMenu}
              >
                <span className="paie-admin-icon">○</span>
                <span>Clientes</span>
              </NavLink>

              <NavLink
                to="/huespedes"
                className={enlaceClase}
                onClick={cerrarMenu}
              >
                <span className="paie-admin-icon">♧</span>
                <span>Huéspedes</span>
              </NavLink>

              <NavLink
                to="/feedback"
                className={enlaceClase}
                onClick={cerrarMenu}
              >
                <span className="paie-admin-icon">★</span>
                <span>Opiniones</span>
              </NavLink>
            </>
          )}

          <div className="paie-admin-nav-title">
            CUENTA
          </div>

          <NavLink
            to="/perfil"
            className={enlaceClase}
            onClick={cerrarMenu}
          >
            <span className="paie-admin-icon">◎</span>
            <span>Mi perfil</span>
          </NavLink>

        </nav>

        {/* BOTÓN PARA OCULTAR / MOSTRAR MÓDULOS EN PC */}
        <button
          type="button"
          className="paie-desktop-modules-toggle"
          onClick={() => setModulosOcultos((actual) => !actual)}
          aria-label={modulosOcultos ? 'Mostrar módulos' : 'Ocultar módulos'}
          title={modulosOcultos ? 'Mostrar módulos' : 'Ocultar módulos'}
        >
          <span>{modulosOcultos ? '›' : '‹'}</span>
        </button>

        {/* USUARIO */}
        <div className="paie-admin-user">

          <div className="paie-admin-user-avatar">
            {(user?.nombre_usuario || user?.nombre || 'U')
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="paie-admin-user-info">
            <strong>
              {user?.nombre_usuario || user?.nombre || 'Usuario'}
            </strong>

            <span>
              {user?.rol || 'Cliente'}
            </span>
          </div>

        </div>

        {/* LOGOUT */}
        <button
          type="button"
          className="paie-admin-logout"
          onClick={cerrarSesion}
        >
          <span>↪</span>
          <span>Cerrar sesión</span>
        </button>

      </aside>

      {/* CONTENIDO */}
      <main className="paie-admin-main">

        <header className="paie-admin-topbar">

          <div className="paie-admin-topbar-left">
            <span className="paie-admin-eyebrow">
              PAIE ROYALE
            </span>

            <span className="paie-admin-section">
              Gestión hotelera
            </span>
          </div>

          <div className="paie-admin-topbar-right">

            <div className="paie-admin-online">
              <span />
              Sistema en línea
            </div>

            <div className="paie-admin-top-user">
              <strong>
                {user?.nombre_usuario || user?.nombre || 'Usuario'}
              </strong>

              <small>
                {user?.rol || 'Cliente'}
              </small>
            </div>

            <button
              type="button"
              className="paie-admin-top-logout"
              onClick={cerrarSesion}
              title="Cerrar sesión"
            >
              ↪
            </button>

          </div>

        </header>

        <div className="paie-admin-content">
          <Outlet />
        </div>

      </main>

    </div>
  );
}