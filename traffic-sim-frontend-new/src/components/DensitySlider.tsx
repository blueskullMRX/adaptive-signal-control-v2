import React from 'react';

interface DensitySliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
  icon: string;
}

const DensitySlider: React.FC<DensitySliderProps> = ({ 
  label, 
  value, 
  onChange, 
  color, 
  icon 
}) => {
  return (
    <div style={{
      marginBottom: '20px',
      padding: '15px',
      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.1) 100%)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.05)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <label style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          {label}
        </label>
        <span style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: color,
          padding: '4px 12px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '20px',
          minWidth: '50px',
          textAlign: 'center'
        }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.1) ${value}%, rgba(255,255,255,0.1) 100%)`,
          outline: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
  );
};

export default DensitySlider;
