import React from 'react';

interface StatusBarProps {
  isOnline: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({ isOnline }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '40px',
      background: isOnline
        ? 'linear-gradient(90deg, #4CAF50 0%, #45a049 100%)'
        : 'linear-gradient(90deg, #f44336 0%, #da190b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '14px',
      fontWeight: 'bold',
      zIndex: 10000,
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.3s ease'
    }}>
      <span style={{ marginRight: '10px' }}>
        {isOnline ? '🟢' : '🔴'}
      </span>
      {isOnline ? 'Connected to Blockchain Network' : 'Disconnected - Reconnecting...'}
    </div>
  );
};

export default StatusBar;
