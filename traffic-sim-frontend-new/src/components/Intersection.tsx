import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { IntersectionState, Vehicle as VehicleType } from '../types';
import Vehicle from './Vehicle';
import TrafficLight from './TrafficLight';
import DensitySlider from './DensitySlider';

interface IntersectionProps {
  intersection: IntersectionState;
  onDensityChange: (id: string, direction: 'NS' | 'EW', value: number) => void;
}

interface ExtendedVehicle extends VehicleType {
  hasEnteredIntersection?: boolean;
  isStopped?: boolean;
}

const Intersection: React.FC<IntersectionProps> = ({ intersection, onDensityChange }) => {
  const [vehicles, setVehicles] = useState<ExtendedVehicle[]>([]);
  const [localTimeRemaining, setLocalTimeRemaining] = useState(intersection.lightState.timeRemaining);
  const [lastBackendUpdate, setLastBackendUpdate] = useState(Date.now());

  const ROAD_WIDTH = 60;
  const LANE_WIDTH = 30;
  const ROAD_START = 220;
  const INTERSECTION_START = 220;
  const INTERSECTION_END = 280;

  // Sync with backend updates
  useEffect(() => {
    setLocalTimeRemaining(intersection.lightState.timeRemaining);
    setLastBackendUpdate(Date.now());
  }, [intersection.lightState.timeRemaining, intersection.lightState.state]);

  // Local countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTimeRemaining(prev => {
        const newValue = prev - 0.1;
        return newValue > 0 ? newValue : 0;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const spawnVehicles = useCallback(() => {
    const newVehicles: ExtendedVehicle[] = [];

    if (Math.random() * 100 < intersection.densityNS / 10) {
      if (Math.random() > 0.5) {
        newVehicles.push({
          id: `N-${Date.now()}-${Math.random()}`,
          x: ROAD_START + 5,
          y: 500,
          direction: 'N',
          speed: 2.5,
          color: `hsl(${200 + Math.random() * 40}, 75%, 55%)`,
          hasEnteredIntersection: false,
          isStopped: false
        });
      } else {
        newVehicles.push({
          id: `S-${Date.now()}-${Math.random()}`,
          x: ROAD_START + LANE_WIDTH + 5,
          y: -40,
          direction: 'S',
          speed: 2.5,
          color: `hsl(${160 + Math.random() * 40}, 75%, 55%)`,
          hasEnteredIntersection: false,
          isStopped: false
        });
      }
    }

    if (Math.random() * 100 < intersection.densityEW / 10) {
      if (Math.random() > 0.5) {
        newVehicles.push({
          id: `E-${Date.now()}-${Math.random()}`,
          x: -40,
          y: ROAD_START + 5,
          direction: 'E',
          speed: 2.5,
          color: `hsl(${30 + Math.random() * 40}, 75%, 55%)`,
          hasEnteredIntersection: false,
          isStopped: false
        });
      } else {
        newVehicles.push({
          id: `W-${Date.now()}-${Math.random()}`,
          x: 500,
          y: ROAD_START + LANE_WIDTH + 5,
          direction: 'W',
          speed: 2.5,
          color: `hsl(${0 + Math.random() * 40}, 75%, 55%)`,
          hasEnteredIntersection: false,
          isStopped: false
        });
      }
    }

    if (newVehicles.length) {
      setVehicles(prev => [...prev, ...newVehicles]);
    }
  }, [intersection.densityNS, intersection.densityEW, ROAD_START, LANE_WIDTH]);

  const updateVehicles = useCallback(() => {
    setVehicles(prev => {
      const state = intersection.lightState.state;
      const nsGreen = state === 'GREEN_NS';
      const ewGreen = state === 'GREEN_EW';

      const stopLines = {
        N: INTERSECTION_END + 8,
        S: INTERSECTION_START - 8,
        E: INTERSECTION_START - 8,
        W: INTERSECTION_END + 8
      };

      return prev
        .map(vehicle => {
          let { x, y, hasEnteredIntersection = false, isStopped = false } = vehicle;

          const inside =
            x >= INTERSECTION_START && x <= INTERSECTION_END &&
            y >= INTERSECTION_START && y <= INTERSECTION_END;

          if (inside) {
            hasEnteredIntersection = true;
            isStopped = false;
          }

          const wantsNS = vehicle.direction === 'N' || vehicle.direction === 'S';
          const wantsEW = vehicle.direction === 'E' || vehicle.direction === 'W';
          const lightAllows = (wantsNS && nsGreen) || (wantsEW && ewGreen);

          if (isStopped && lightAllows) {
            isStopped = false;
          }

          if (!hasEnteredIntersection && !lightAllows) {
            switch (vehicle.direction) {
              case 'N': {
                const nextY = y - vehicle.speed;
                if (y > stopLines.N && nextY <= stopLines.N) {
                  y = stopLines.N;
                  isStopped = true;
                }
                break;
              }
              case 'S': {
                const nextY = y + vehicle.speed;
                if (y < stopLines.S && nextY >= stopLines.S) {
                  y = stopLines.S;
                  isStopped = true;
                }
                break;
              }
              case 'E': {
                const nextX = x + vehicle.speed;
                if (x < stopLines.E && nextX >= stopLines.E) {
                  x = stopLines.E;
                  isStopped = true;
                }
                break;
              }
              case 'W': {
                const nextX = x - vehicle.speed;
                if (x > stopLines.W && nextX <= stopLines.W) {
                  x = stopLines.W;
                  isStopped = true;
                }
                break;
              }
            }
          }

          if (!isStopped) {
            switch (vehicle.direction) {
              case 'N': y -= vehicle.speed; break;
              case 'S': y += vehicle.speed; break;
              case 'E': x += vehicle.speed; break;
              case 'W': x -= vehicle.speed; break;
            }
          }

          return { ...vehicle, x, y, hasEnteredIntersection, isStopped };
        })
        .filter(v => v.x > -80 && v.x < 580 && v.y > -80 && v.y < 580);
    });
  }, [intersection.lightState, INTERSECTION_START, INTERSECTION_END]);

  useEffect(() => {
    const ticker = setInterval(() => {
      spawnVehicles();
      updateVehicles();
    }, 100);

    return () => clearInterval(ticker);
  }, [spawnVehicles, updateVehicles]);

  const getStateColor = () => {
    if (intersection.lightState.state.includes('GREEN')) return '#4CAF50';
    if (intersection.lightState.state.includes('YELLOW')) return '#ffeb3b';
    return '#ff5252';
  };

  const getStateEmoji = () => {
    if (intersection.lightState.state.includes('GREEN')) return '🟢';
    if (intersection.lightState.state.includes('YELLOW')) return '🟡';
    return '🔴';
  };

  const stoppedVehicles = vehicles.filter(v => v.isStopped).length;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(20, 20, 40, 0.9) 100%)',
      borderRadius: '20px',
      padding: '25px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.05)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '24px' }}>
          🚦 Intersection {intersection.id}
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: intersection.lightState.currentPhase === 'NS' ? '#4CAF50' : '#333'
          }}>
            {intersection.lightState.currentPhase === 'NS' ? '🟢' : '🔴'} NS
          </span>
          <span style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: intersection.lightState.currentPhase === 'EW' ? '#4CAF50' : '#333'
          }}>
            {intersection.lightState.currentPhase === 'EW' ? '🟢' : '🔴'} EW
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '15px' }}>Controls</h3>
          
          <DensitySlider
            label="North-South Traffic"
            value={intersection.densityNS}
            onChange={(value) => onDensityChange(intersection.id, 'NS', value)}
            color="#00d2ff"
            icon="⬆️⬇️"
          />
          
          <DensitySlider
            label="East-West Traffic"
            value={intersection.densityEW}
            onChange={(value) => onDensityChange(intersection.id, 'EW', value)}
            color="#3a7bd5"
            icon="⬅️➡️"
          />

          <div style={{
            padding: '15px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            marginTop: '10px'
          }}>
            <h4 style={{ color: '#fff', fontSize: '14px', marginBottom: '10px' }}>Status</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa' }}>Light State:</span>
                <span style={{ color: getStateColor(), fontWeight: 'bold' }}>
                  {getStateEmoji()} {intersection.lightState.state.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa' }}>Time Left:</span>
                <span style={{ color: getStateColor(), fontWeight: 'bold' }}>
                  {Math.ceil(localTimeRemaining)}s
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa' }}>Stopped:</span>
                <span style={{ color: '#ff5252', fontWeight: 'bold' }}>{stoppedVehicles} 🛑</span>
              </div>
            </div>
          </div>

          {intersection.decision && (
            <div style={{
              padding: '15px',
              background: 'rgba(0, 210, 255, 0.1)',
              borderRadius: '12px',
              marginTop: '10px',
              border: '1px solid rgba(0, 210, 255, 0.2)'
            }}>
              <h4 style={{ color: '#00d2ff', fontSize: '14px', marginBottom: '10px' }}>
                📊 Blockchain Decision
              </h4>
              <div style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.6' }}>
                <div><strong>Phase:</strong> {intersection.decision.phase}</div>
                <div><strong>Duration:</strong> {intersection.decision.greenDuration}s</div>
                <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                  {intersection.decision.algorithmReason}
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '15px' }}>
            Live Simulation
          </h3>
          <div style={{
            position: 'relative',
            width: '500px',
            height: '500px',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
          }}>
            {/* Vertical Road */}
            <div style={{
              position: 'absolute',
              left: `${ROAD_START}px`,
              top: 0,
              width: `${ROAD_WIDTH}px`,
              height: '100%',
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
              boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{
                position: 'absolute',
                left: `${LANE_WIDTH - 2}px`,
                top: 0,
                width: '4px',
                height: '100%',
                backgroundImage: 'repeating-linear-gradient(0deg, #ffd700, #ffd700 20px, transparent 20px, transparent 40px)'
              }} />
            </div>

            {/* Horizontal Road */}
            <div style={{
              position: 'absolute',
              top: `${ROAD_START}px`,
              left: 0,
              width: '100%',
              height: `${ROAD_WIDTH}px`,
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
              boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{
                position: 'absolute',
                top: `${LANE_WIDTH - 2}px`,
                left: 0,
                width: '100%',
                height: '4px',
                backgroundImage: 'repeating-linear-gradient(90deg, #ffd700, #ffd700 20px, transparent 20px, transparent 40px)'
              }} />
            </div>

            {/* Intersection Center */}
            <div style={{
              position: 'absolute',
              left: `${ROAD_START}px`,
              top: `${ROAD_START}px`,
              width: `${ROAD_WIDTH}px`,
              height: `${ROAD_WIDTH}px`,
              background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.05) 0%, rgba(58, 123, 213, 0.05) 100%)',
              border: '2px solid rgba(0, 210, 255, 0.2)',
              boxShadow: '0 0 30px rgba(0, 210, 255, 0.1)'
            }} />

            {/* Stop Lines */}
            {[
              { left: ROAD_START, top: INTERSECTION_START - 2, width: ROAD_WIDTH, height: 4 },
              { left: ROAD_START, top: INTERSECTION_END, width: ROAD_WIDTH, height: 4 },
              { left: INTERSECTION_START - 2, top: ROAD_START, width: 4, height: ROAD_WIDTH },
              { left: INTERSECTION_END, top: ROAD_START, width: 4, height: ROAD_WIDTH }
            ].map((line, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${line.left}px`,
                top: `${line.top}px`,
                width: `${line.width}px`,
                height: `${line.height}px`,
                background: 'white',
                boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                zIndex: 10
              }} />
            ))}

            {/* Traffic Lights */}
            <TrafficLight state={intersection.lightState} position="top" />
            <TrafficLight state={intersection.lightState} position="bottom" />
            <TrafficLight state={intersection.lightState} position="left" />
            <TrafficLight state={intersection.lightState} position="right" />

            {/* Vehicles */}
            <AnimatePresence>
              {vehicles.map(vehicle => (
                <Vehicle key={vehicle.id} vehicle={vehicle} />
              ))}
            </AnimatePresence>

            {/* Vehicle Count */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '8px 12px',
              borderRadius: '20px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              zIndex: 1001
            }}>
              🚗 {vehicles.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intersection;
