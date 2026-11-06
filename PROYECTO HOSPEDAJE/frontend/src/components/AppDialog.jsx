import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';

import './AppDialog.css';


const DialogContext = createContext(null);


function obtenerTipo(mensaje) {
  const texto = String(mensaje || '').trim().toLowerCase();

  if (
    texto.includes('correctamente') ||
    texto.includes('exitosamente') ||
    texto.includes('registrada correctamente')
  ) {
    return 'success';
  }

  if (
    texto.includes('no se pudo') ||
    texto.includes('error') ||
    texto.includes('no fue posible') ||
    texto.includes('no puedes') ||
    texto.includes('no existe')
  ) {
    return 'error';
  }

  if (
    texto.includes('debes ') ||
    texto.includes('selecciona ') ||
    texto.includes('seleccionar ') ||
    texto.includes('atención') ||
    texto.includes('seguro')
  ) {
    return 'warning';
  }

  return 'info';
}


function tituloPorTipo(tipo) {
  if (tipo === 'success') return 'Operación realizada';
  if (tipo === 'error') return 'Ocurrió un problema';
  if (tipo === 'warning') return 'Atención';
  return 'Información';
}


function Icono({ tipo }) {
  if (tipo === 'success') return <span aria-hidden="true" className="pr-dialog-symbol">OK</span>;
  if (tipo === 'error') return <span aria-hidden="true" className="pr-dialog-symbol">!</span>;
  if (tipo === 'warning') return <span aria-hidden="true" className="pr-dialog-symbol">!</span>;

  return <span aria-hidden="true" className="pr-dialog-symbol">i</span>;
}


function AppDialog({
  dialog,
  onClose,
  onConfirm
}) {
  useEffect(() => {
    if (!dialog?.open) return undefined;

    const manejarTecla = (event) => {
      if (event.key === 'Escape' && !dialog.confirm) {
        onClose();
      }

      if (
        event.key === 'Enter' &&
        dialog.confirm
      ) {
        onConfirm();
      }
    };

    window.addEventListener(
      'keydown',
      manejarTecla
    );

    return () => {
      window.removeEventListener(
        'keydown',
        manejarTecla
      );
    };
  }, [
    dialog,
    onClose,
    onConfirm
  ]);


  if (!dialog?.open) {
    return null;
  }


  return (
    <div
      className="pr-dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !dialog.confirm
        ) {
          onClose();
        }
      }}
    >
      <section
        className={`pr-dialog pr-dialog-${dialog.type}`}
        role={dialog.confirm ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="pr-dialog-title"
        aria-describedby="pr-dialog-message"
      >
        <div className="pr-dialog-icon">
          <Icono tipo={dialog.type} />
        </div>

        <div className="pr-dialog-content">
          <h2 id="pr-dialog-title">
            {dialog.title}
          </h2>

          <p id="pr-dialog-message">
            {dialog.message}
          </p>
        </div>

        <div className="pr-dialog-actions">
          {dialog.confirm ? (
            <>
              <button
                type="button"
                className="pr-dialog-button pr-dialog-secondary"
                onClick={onClose}
              >
                {dialog.cancelText}
              </button>

              <button
                type="button"
                autoFocus
                className={`pr-dialog-button pr-dialog-${dialog.type}-action`}
                onClick={onConfirm}
              >
                {dialog.confirmText}
              </button>
            </>
          ) : (
            <button
              type="button"
              autoFocus
              className="pr-dialog-button pr-dialog-primary"
              onClick={onClose}
            >
              {dialog.buttonText}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}


export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const timerRef = useRef(null);
  const resolverRef = useRef(null);


  const limpiarTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);


  const cerrar = useCallback((resultado = false) => {
    limpiarTimer();

    if (resolverRef.current) {
      const resolver = resolverRef.current;
      resolverRef.current = null;
      resolver(resultado);
    }

    setDialog(null);
  }, [limpiarTimer]);


  const notify = useCallback((
    message,
    options = {}
  ) => {
    limpiarTimer();

    const type =
      options.type ||
      obtenerTipo(message);

    setDialog({
      open: true,
      confirm: false,
      type,
      title:
        options.title ||
        tituloPorTipo(type),
      message: String(message || ''),
      buttonText:
        options.buttonText ||
        'Entendido'
    });

    const duration =
      Number.isFinite(options.duration)
        ? options.duration
        : 4200;

    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        setDialog(null);
        timerRef.current = null;
      }, duration);
    }
  }, [limpiarTimer]);


  const confirmDialog = useCallback((
    message,
    options = {}
  ) => {
    limpiarTimer();

    return new Promise((resolve) => {
      resolverRef.current = resolve;

      setDialog({
        open: true,
        confirm: true,
        type: options.type || 'warning',
        title:
          options.title ||
          'Confirmar acción',
        message: String(message || ''),
        confirmText:
          options.confirmText ||
          'Confirmar',
        cancelText:
          options.cancelText ||
          'Cancelar'
      });
    });
  }, [limpiarTimer]);


  useEffect(() => {
    return () => {
      limpiarTimer();

      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
    };
  }, [limpiarTimer]);


  const value = {
    notify,
    confirmDialog
  };


  return (
    <DialogContext.Provider value={value}>
      {children}

      <AppDialog
        dialog={dialog}
        onClose={() => cerrar(false)}
        onConfirm={() => cerrar(true)}
      />
    </DialogContext.Provider>
  );
}


export function useDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error(
      'useDialog debe utilizarse dentro de DialogProvider.'
    );
  }

  return context;
}
