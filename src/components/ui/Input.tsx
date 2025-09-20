import React from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: string;
  disabled?: boolean;
  autoComplete?: string;
  autoCapitalize?: string;
  autoCorrect?: string;
  spellCheck?: boolean;
  name?: string;
  id?: string;
  [key: string]: any; // Allow additional props
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  error,
  required = false,
  type = 'text',
  value,
  onChange,
  className = '',
  min,
  max,
  step,
  disabled = false,
  autoComplete,
  autoCapitalize,
  autoCorrect,
  spellCheck,
  name,
  id,
  ...rest
}) => {
  const inputId = label ? label.toLowerCase().replace(/\s+/g, '-') : undefined;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={id || inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        spellCheck={spellCheck}
        className={`
          w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          ${error ? 'border-red-500 focus:ring-red-500' : ''} 
          ${className}
        `}
        {...rest}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default Input;
