import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  HashRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { DialogProvider } from './components/AppDialog';
import Protected from './routes/Protected';

import Layout from './layouts/Layout';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PagoTarjeta from './pages/PagoTarjeta';
import Pagos from './pages/Pagos';

import Dashboard from './pages/Dashboard';
import Reservas from './pages/Reservas';
import Module from './pages/Module';
import Roles from './pages/Roles';

import './styles/global.css';
import './styles/paie-royale-luxury.css';
import './styles/mobile-tablet.css';


/*
  Módulos disponibles para Administrador y Cliente.
*/
const clientModules = [
  'habitaciones',
  'servicios',
  'paquetes',
  'huespedes',
  'feedback'
];


function App() {
  return (
    <Routes>

      {/* =========================
          PARTE PÚBLICA
      ========================== */}

      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/registro"
        element={<Register />}
      />

      <Route
        path="/recuperar-contrasena"
        element={<ForgotPassword />}
      />

      <Route
        path="/restablecer-contrasena"
        element={<ResetPassword />}
      />


      {/* =========================
          USUARIOS AUTENTICADOS
      ========================== */}

      <Route element={<Protected />}>

        <Route element={<Layout />}>

          {/* =========================
              RESERVAS
          ========================== */}

          <Route
            path="/reservas"
            element={<Reservas />}
          />

          <Route
            path="/pagos"
            element={<Pagos />}
          />


          {/* =========================
              PAGO CON TARJETA
          ========================== */}

          <Route
            path="/pago-tarjeta"
            element={<PagoTarjeta />}
          />


          {/* =========================
              MÓDULOS CLIENTE
          ========================== */}

          {clientModules.map((module) => (
            <Route
              key={module}
              path={`/${module}`}
              element={<Module name={module} />}
            />
          ))}


          {/* =========================
              PERFIL
          ========================== */}

          <Route
            path="/perfil"
            element={<Module name="clientes" />}
          />


          {/* =========================
              SOLO ADMINISTRADOR
          ========================== */}

          <Route
            element={
              <Protected
                role="Administrador"
              />
            }
          >

            {/* Dashboard */}

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />


            {/* Roles */}

            <Route
              path="/roles"
              element={<Roles />}
            />


            {/* Usuarios */}

            <Route
              path="/usuarios"
              element={
                <Module
                  name="usuarios"
                />
              }
            />


            {/* Clientes */}

            <Route
              path="/clientes"
              element={
                <Module
                  name="clientes"
                />
              }
            />

          </Route>

        </Route>

      </Route>


      {/* =========================
          RUTA NO ENCONTRADA
      ========================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}


createRoot(
  document.getElementById('root')
).render(

  <React.StrictMode>

    <HashRouter>

      <DialogProvider>

        <AuthProvider>

          <App />

        </AuthProvider>

      </DialogProvider>

    </HashRouter>

  </React.StrictMode>

);