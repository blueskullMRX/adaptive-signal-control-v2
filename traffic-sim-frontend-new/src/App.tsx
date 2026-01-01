import React, { useState, useEffect } from 'react';
import Intersection from './components/Intersection';
import StatusBar from './components/StatusBar';
import { IntersectionState, EmergencyAlert } from './types';
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
      densityEW: 50,
      emergencyActive: false
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
      densityEW: 50,
      emergencyActive: false
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
      densityEW: 50,
      emergencyActive: false
    }
  ]);

  const [isOnline, setIsOnline] = useState(false);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);

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
            emergencyActive: backendState.decision?.isEmergency || false,
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

    const handleEmergencyAlert = (alert: EmergencyAlert) => {
      console.log('🚨 Emergency alert received:', alert);
      const alertWithId = { ...alert, id: Date.now() };
      setEmergencyAlerts(prev => [...prev, alertWithId]);
      
      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setEmergencyAlerts(prev => prev.filter(a => a.id !== alertWithId.id));
      }, 10000);
    };

    wsService.onMessage((data: any) => {
      if (data.type === 'EMERGENCY_ALERT') {
        handleEmergencyAlert(data.data);
      } else {
        handleStateUpdate(data);
      }
    });

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

  const handleEmergencyRequest = async (intersectionId: string, direction: 'NS' | 'EW', vehicleType: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/emergency/${intersectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          vehicleType,
          vehicleId: `${vehicleType}_${Date.now()}`
        })
      });

      const result = await response.json();
      console.log('🚨 Emergency request submitted:', result);
    } catch (error) {
      console.error('❌ Failed to submit emergency request:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      paddingTop: '40px'
    }}>
      <StatusBar isOnline={isOnline} />

      {/* Emergency Alert Banner */}
      {emergencyAlerts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {emergencyAlerts.map(alert => (
            <div key={alert.id} style={{
              background: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '10px',
              boxShadow: '0 8px 32px rgba(255, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              animation: 'pulse 1.5s infinite',
              border: '2px solid rgba(255, 255, 255, 0.3)'
            }}>
              <span style={{ fontSize: '24px' }}>🚨</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  EMERGENCY VEHICLE DETECTED
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  {alert.vehicleType} at Intersection {alert.intersectionId} - Direction {alert.direction}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
            <div key={intersection.id} style={{ position: 'relative' }}>
              <Intersection
                intersection={intersection}
                onDensityChange={handleDensityChange}
              />
              
              {/* Emergency Control Panel */}
              <div style={{
                marginTop: '15px',
                padding: '20px',
                background: 'rgba(255, 0, 0, 0.1)',
                border: '2px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '12px'
              }}>
                <div style={{
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>🚨</span>
                  <span>Emergency Vehicle Control</span>
                  {intersection.emergencyActive && (
                    <span style={{
                      background: '#ff0000',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      animation: 'pulse 1.5s infinite'
                    }}>
                      ACTIVE
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {/* NS Direction */}
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>
                      North-South Direction
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['AMBULANCE', 'FIRE_TRUCK', 'POLICE'].map(type => (
                        <button
                          key={`NS-${type}`}
                          onClick={() => handleEmergencyRequest(intersection.id, 'NS', type)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {type === 'AMBULANCE' ? '🚑' : type === 'FIRE_TRUCK' ? '🚒' : '🚓'}
                          <br />
                          {type.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* EW Direction */}
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>
                      East-West Direction
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['AMBULANCE', 'FIRE_TRUCK', 'POLICE'].map(type => (
                        <button
                          key={`EW-${type}`}
                          onClick={() => handleEmergencyRequest(intersection.id, 'EW', type)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {type === 'AMBULANCE' ? '🚑' : type === 'FIRE_TRUCK' ? '🚒' : '🚓'}
                          <br />
                          {type.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default App;
