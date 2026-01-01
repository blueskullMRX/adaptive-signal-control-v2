import React from 'react';
import { motion } from 'framer-motion';
import { Vehicle as VehicleType } from '../types';

interface VehicleProps {
  vehicle: VehicleType;
}

const Vehicle: React.FC<VehicleProps> = ({ vehicle }) => {
  const getRotation = () => {
    switch (vehicle.direction) {
      case 'N': return 0;
      case 'E': return 90;
      case 'S': return 180;
      case 'W': return 270;
      default: return 0;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      style={{
        position: 'absolute',
        left: `${vehicle.x}px`,
        top: `${vehicle.y}px`,
        width: '20px',
        height: '30px',
        borderRadius: '4px 4px 8px 8px',
        background: `linear-gradient(135deg, ${vehicle.color}, ${vehicle.color}dd)`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        transform: `rotate(${getRotation()}deg)`,
        transformOrigin: 'center center',
        zIndex: 100,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        transition: 'left 0.1s linear, top 0.1s linear'
      }}
    >
      <div style={{
        width: '100%',
        height: '40%',
        background: 'rgba(200, 230, 0, 0.8)',
        borderRadius: '2px',
        marginTop: '2px'
      }} />
    </motion.div>
  );
};

export default Vehicle;
