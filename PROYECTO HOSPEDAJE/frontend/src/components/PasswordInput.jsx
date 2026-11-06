import { useState } from 'react';

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M2.4 12s3.3-6 9.6-6 9.6 6 9.6 6-3.3 6-9.6 6-9.6-6-9.6-6Z" />
        <path d="M9.4 12a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 0 0-5.2 0Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.3 0 9.6 6 9.6 6a17.4 17.4 0 0 1-3.2 3.7" />
      <path d="M6.1 8.1C3.8 9.7 2.4 12 2.4 12s3.3 6 9.6 6c1.1 0 2.1-.2 3-.5" />
      <path d="M9.9 9.9a2.6 2.6 0 0 0 3.7 3.7" />
    </svg>
  );
}

export default function PasswordInput({
  value,
  onChange,
  className = '',
  inputClassName = '',
  wrapperClassName = '',
  placeholder,
  name,
  id,
  autoComplete,
  required,
  minLength,
  maxLength,
  disabled,
  inputMode,
  onBlur,
  ...rest
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`pr-password-field ${wrapperClassName}`.trim()}>
      <input
        {...rest}
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        disabled={disabled}
        inputMode={inputMode}
        className={`${className} ${inputClassName}`.trim()}
      />

      <button
        type="button"
        className="pr-password-toggle"
        onClick={() => setVisible(previous => !previous)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <EyeIcon visible={visible} />
      </button>
    </div>
  );
}
