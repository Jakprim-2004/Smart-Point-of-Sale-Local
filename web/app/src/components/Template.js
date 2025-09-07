import React from 'react';
import Sidebar from './Sidebar';

function Template({ children }) {
  const mainContentStyle = {
    marginLeft: '250px',
    padding: '20px',
    minHeight: '100vh',
    backgroundColor: '#f4f6f9'
  };

  return (
    <div>
      <Sidebar />
      <div style={mainContentStyle}>
        {children}
      </div>
    </div>
  );
}

export default Template;
