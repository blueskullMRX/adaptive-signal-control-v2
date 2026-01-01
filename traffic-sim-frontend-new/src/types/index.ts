export type Direction = 'N' | 'S' | 'E' | 'W';

export type LightState =
  | 'RED'
  | 'GREEN_NS'
  | 'GREEN_EW'
  | 'YELLOW_NS'
  | 'YELLOW_EW'
  | 'ALL_RED_TO_NS'
  | 'ALL_RED_TO_EW';

export interface Vehicle {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  color: string;
}

export interface TrafficLightState {
  currentPhase: 'NS' | 'EW' | null;
  targetPhase: 'NS' | 'EW' | null;
  state: LightState;
  timeRemaining: number;
  lastUpdate: number;
  inTransition: boolean;
  greenDuration: number;
}

export interface TrafficDecision {
  intersectionId: string;
  greenDuration: number;
  phase: 'NS' | 'EW';
  timestamp: string;
  priorityReason: string;
  algorithm: string;
  densityNS: number;
  densityEW: number;
  algorithmReason: string;
  isEmergency?: boolean;
  emergencyVehicleType?: string | null;
}

export interface IntersectionState {
  id: string;
  decision: TrafficDecision | null;
  lightState: TrafficLightState;
  vehicles: Vehicle[];
  densityNS: number;
  densityEW: number;
  emergencyActive?: boolean;
}

export interface Stats {
  totalDecisions: number;
  avgDuration: number;
  phaseSwitches: number;
}

export interface EmergencyAlert {
  id?: number;
  intersectionId: string;
  direction: 'NS' | 'EW';
  vehicleType: 'AMBULANCE' | 'FIRE_TRUCK' | 'POLICE';
  emergencyKey: string;
  timestamp: string;
}
