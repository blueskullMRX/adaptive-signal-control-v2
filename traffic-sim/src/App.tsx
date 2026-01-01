import React, { useState, useEffect } from 'react';
import Intersection from './components/Intersection';
import StatusBar from './components/StatusBar';
import { IntersectionState } from './types';
import wsService from './services/websocket';

const App: React.FC = () => {
  const [intersections, setIntersections] = useState<IntersectionState[]>([
    {
      id: 'A',
      decision: null,
      lightState: {
        currentPhase: null,
        targetPhase: null,
        state: 'RED',
        timeRemaining: 0,
        lastUpdate: Date.now(),
        inTransition: false,
        greenDuration: 60
      },
      vehicles: [],
      densityNS: 50,
      densityEW: 50
    },
    {
      id: 'B',
      decision: null,
      lightState: {
        currentPhase: null,
        targetPhase: null,
        state: 'RED',
        timeRemaining: 0,
        lastUpdate: Date.now(),
        inTransition: false,
        greenDuration: 60
      },
      vehicles: [],
      densityNS: 50,
      densityEW: 50
    },
    {
      id: 'C',
      decision: null,
      lightState: {
        currentPhase: null,
        targetPhase: null,
        state: 'RED',
        timeRemaining: 0,
        lastUpdate: Date.now(),
        inTransition: false,
        greenDuration: 60
      },
      vehicles: [],
      densityNS: 50,
      densityEW: 50
    }
  ]);

  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    console.log('🔌 Initializing WebSocket connection...');
    wsService.connect();

    const handleStateUpdate = (data: { [key: string]: any }) => {
      console.log('📡 Received state update from backend');
      setIsOnline(true);

      setIntersections(prev => prev.map(intersection => {
        const backendState = data[intersection.id];
        
        if (backendState) {
          return {
            ...intersection,
            decision: backendState.decision,
            densityNS: backendState.densityNS,
            densityEW: backendState.densityEW,
            lightState: {
              currentPhase: backendState.currentPhase,
              targetPhase: backendState.targetPhase,
              state: backendState.state,
              timeRemaining: backendState.timeRemaining,
              lastUpdate: backendState.lastUpdate,
              inTransition: backendState.inTransition,
              greenDuration: backendState.greenDuration
            }
          };
        }
        return intersection;
      }));
    };

    wsService.onMessage(handleStateUpdate);

    const statusInterval = setInterval(() => {
      setIsOnline(wsService.isConnected());
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      wsService.removeMessageHandler(handleStateUpdate);
      wsService.disconnect();
    };
  }, []);

  const handleDensityChange = (id: string, direction: 'NS' | 'EW', value: number) => {
    setIntersections(prev => prev.map(intersection => {
      if (intersection.id === id) {
        return {
          ...intersection,
          [direction === 'NS' ? 'densityNS' : 'densityEW']: value
        };
      }
      return intersection;
    }));

    wsService.sendDensityUpdate(id, direction, value);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      paddingTop: '40px'
    }}>
      <StatusBar isOnline={isOnline} />

      <div style={{ padding: '40px 20px' }}>
        <header style={{
          textAlign: 'center',
          marginBottom: '40px',
          color: 'white'
        }}>
          <h1 style={{
            fontSize: '48px',
            margin: '0 0 10px 0',
            background: 'linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            🚦 Smart Traffic Control System
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#aaa',
            margin: 0
          }}>
            Real-time Blockchain-Based Traffic Management
          </p>
          <div style={{
            marginTop: '15px',
            padding: '8px 20px',
            background: 'rgba(0, 210, 255, 0.1)',
            border: '1px solid rgba(0, 210, 255, 0.3)',
            borderRadius: '20px',
            display: 'inline-block',
            fontSize: '14px',
            color: '#00d2ff'
          }}>
            ⛓️ Powered by Hyperledger Fabric
          </div>
        </header>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '30px',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {intersections.map(intersection => (
            <Intersection
              key={intersection.id}
              intersection={intersection}
              onDensityChange={handleDensityChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
