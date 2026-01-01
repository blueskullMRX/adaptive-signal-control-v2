import React from 'react';
import { TrafficLightState } from '../types';

interface TrafficLightProps {
  state: TrafficLightState;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TrafficLight: React.FC<TrafficLightProps> = ({ state, position }) => {
  const getPosition = () => {
    switch (position) {
      case 'top': return { top: '180px', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom': return { bottom: '180px', left: '50%', transform: 'translateX(-50%)' };
      case 'left': return { left: '180px', top: '50%', transform: 'translateY(-50%)' };
      case 'right': return { right: '180px', top: '50%', transform: 'translateY(-50%)' };
    }
  };

  const isVertical = position === 'top' || position === 'bottom';
  const isNS = state.state === 'GREEN_NS' || state.state === 'YELLOW_NS';
  const isEW = state.state === 'GREEN_EW' || state.state === 'YELLOW_EW';
  
  let lightColor = 'red';
  if (isVertical && isNS) {
    lightColor = state.state === 'GREEN_NS' ? 'green' : 'yellow';
  } else if (!isVertical && isEW) {
    lightColor = state.state === 'GREEN_EW' ? 'green' : 'yellow';
  }

  const getLightStyle = (color: string) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: lightColor === color
      ? color === 'red' ? '#ff5252' : color === 'yellow' ? '#ffeb3b' : '#4CAF50'
      : '#333',
    boxShadow: lightColor === color ? `0 0 15px ${color}` : 'none',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease'
  });

  return (
    <div style={{
      position: 'absolute',
      ...getPosition(),
      zIndex: 1000,
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      padding: '8px',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
      border: '2px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={getLightStyle('red')} />
      <div style={getLightStyle('yellow')} />
      <div style={getLightStyle('green')} />
    </div>
  );
};

export default TrafficLight;
