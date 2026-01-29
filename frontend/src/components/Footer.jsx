import React from 'react';

const Footer = () => {
  const footerStyle = {
    backgroundColor: '#f9fafb',
    padding: '40px 0',
    marginTop: '80px',
    borderTop: '1px solid #e5e7eb'
  };

  const contentStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  };

  const linksStyle = {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap'
  };

  const linkStyle = {
    color: '#6b7280',
    fontSize: '14px',
    transition: 'color 0.3s ease'
  };

  const copyStyle = {
    color: '#9ca3af',
    fontSize: '14px'
  };

  return (
    <footer style={footerStyle}>
      <div className="container" style={contentStyle}>
        <div style={linksStyle}>
          <a href="#" style={linkStyle}>Privacy</a>
          <a href="#" style={linkStyle}>About</a>
          <a href="#" style={linkStyle}>Contact</a>
          <a href="#" style={linkStyle}>Academic Project</a>
        </div>
        <div style={copyStyle}>
          © 2024 NutriFit. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;