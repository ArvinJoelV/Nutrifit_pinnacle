import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  style = {},
  disabled = false 
}) => {
  const baseStyle = {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    ...style
  };

  const variants = {
    primary: {
      backgroundColor: '#10b981',
      color: 'white',
    },
    secondary: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#374151',
    }
  };

  const buttonStyle = {
    ...baseStyle,
    ...variants[variant],
    ...(disabled && {
      opacity: 0.5,
      cursor: 'not-allowed'
    })
  };

  return (
    <button 
      onClick={onClick} 
      style={buttonStyle}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;