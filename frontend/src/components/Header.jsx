import React from 'react';
import Button from './Button';

const Header = () => {
  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 0',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    zIndex: 100,
    borderBottom: '1px solid #e5e7eb'
  };

  const logoStyle = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#10b981',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const navStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  };

  return (
    <header style={headerStyle}>
      <div style={logoStyle}>
        <span>🌱</span>
        <span>NutriFit</span>
      </div>
      <nav style={navStyle}>
        <a href="#features" style={{ color: '#4b5563', fontWeight: '500' }}>
          Features
        </a>
        <a href="#how" style={{ color: '#4b5563', fontWeight: '500' }}>
          How It Works
        </a>
        <Button 
          variant="ghost" 
          onClick={() => window.location.href = '/login'}
          style={{ padding: '8px 16px' }}
        >
          Login
        </Button>
        <Button 
          onClick={() => window.location.href = '/login'}
          style={{ padding: '8px 16px' }}
        >
          Get Started
        </Button>
      </nav>
    </header>
  );
};

export default Header;