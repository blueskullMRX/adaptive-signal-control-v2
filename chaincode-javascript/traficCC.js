'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class TrafficContract extends Contract {
    async InitLedger(ctx) {
        console.log('Ledger initialized');
        return 'Ledger initialized';
    }

    async SubmitSensorData(ctx, intersectionId, direction, sensorJSON) {
        const timestamp = ctx.stub.getTxTimestamp();
        const txTime = new Date(timestamp.seconds.low * 1000).toISOString();
        const key = `SENSOR_${intersectionId}_${direction}_${txTime}`;
        const data = {
            intersectionId,
            direction,
            sensorJSON: JSON.parse(sensorJSON),
            timestamp: txTime
        };
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(data)));
        await ctx.stub.setEvent('SensorDataSubmitted', Buffer.from(JSON.stringify({ key, data })));
        return key;
    }

    async getRecentDensity(ctx, intersectionId, direction) {
        const iter = await ctx.stub.getStateByRange(
            `SENSOR_${intersectionId}_${direction}_`,
            `SENSOR_${intersectionId}_${direction}_\uffff`
        );

        let latestDensity = 0;
        let result = await iter.next();

        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                try {
                    const data = JSON.parse(result.value.value.toString('utf8'));
                    latestDensity = data.sensorJSON.density || 0;
                } catch (err) {
                    console.error('Error parsing sensor data:', err.message);
                }
            }
            result = await iter.next();
        }
        await iter.close();
        return latestDensity;
    }

    // FIXED: Use deterministic timestamp from transaction
    async SubmitEmergencyRequest(ctx, intersectionId, direction, vehicleId, vehicleType) {
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        const emergencyKey = `EMERGENCY_${intersectionId}_${ctx.stub.getTxID()}`;
        
        const emergencyData = {
            intersectionId,
            direction,
            vehicleId,
            vehicleType,
            timestamp,
            txId: ctx.stub.getTxID(),
            status: 'ACTIVE',
            expiresAt: new Date(txTimestamp.seconds.low * 1000 + 5 * 60 * 1000).toISOString()
        };

        await ctx.stub.putState(emergencyKey, Buffer.from(JSON.stringify(emergencyData)));
        
        await ctx.stub.setEvent('EmergencyVehicleDetected', Buffer.from(JSON.stringify({
            key: emergencyKey,
            data: emergencyData
        })));

        console.log(`🚨 Emergency vehicle ${vehicleType} detected at ${intersectionId} heading ${direction}`);
        return emergencyKey;
    }

    async GetActiveEmergencies(ctx, intersectionId) {
        const iter = await ctx.stub.getStateByRange(
            `EMERGENCY_${intersectionId}_`,
            `EMERGENCY_${intersectionId}_\uffff`
        );

        const activeEmergencies = [];
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.low * 1000);
        let result = await iter.next();

        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                try {
                    const emergency = JSON.parse(result.value.value.toString('utf8'));
                    const expiresAt = new Date(emergency.expiresAt);
                    
                    if (emergency.status === 'ACTIVE' && expiresAt > now) {
                        activeEmergencies.push(emergency);
                    }
                } catch (err) {
                    console.error('Error parsing emergency data:', err.message);
                }
            }
            result = await iter.next();
        }
        await iter.close();

        return JSON.stringify(activeEmergencies);
    }

    async ClearEmergencyRequest(ctx, emergencyKey) {
        const emergencyBytes = await ctx.stub.getState(emergencyKey);
        
        if (!emergencyBytes || emergencyBytes.length === 0) {
            throw new Error(`Emergency request ${emergencyKey} not found`);
        }

        const emergency = JSON.parse(emergencyBytes.toString('utf8'));
        const txTimestamp = ctx.stub.getTxTimestamp();
        emergency.status = 'CLEARED';
        emergency.clearedAt = new Date(txTimestamp.seconds.low * 1000).toISOString();

        await ctx.stub.putState(emergencyKey, Buffer.from(JSON.stringify(emergency)));
        
        await ctx.stub.setEvent('EmergencyCleared', Buffer.from(JSON.stringify({
            key: emergencyKey,
            data: emergency
        })));

        console.log(`✅ Emergency cleared: ${emergencyKey}`);
        return JSON.stringify(emergency);
    }

    async ComputeDecision(ctx, intersectionId) {
        const emergenciesJSON = await this.GetActiveEmergencies(ctx, intersectionId);
        const activeEmergencies = JSON.parse(emergenciesJSON);

        let isEmergency = false;
        let emergencyDirection = null;
        let emergencyVehicleType = null;

        if (activeEmergencies.length > 0) {
            const sortedEmergencies = activeEmergencies.sort((a, b) => {
                const priority = { AMBULANCE: 3, FIRE_TRUCK: 2, POLICE: 1 };
                return (priority[b.vehicleType] || 0) - (priority[a.vehicleType] || 0);
            });

            isEmergency = true;
            emergencyDirection = sortedEmergencies[0].direction;
            emergencyVehicleType = sortedEmergencies[0].vehicleType;
        }

        const densityNS = await this.getRecentDensity(ctx, intersectionId, 'NS');
        const densityEW = await this.getRecentDensity(ctx, intersectionId, 'EW');

        const lastDecisionIter = await ctx.stub.getStateByRange(
            `DECISION_${intersectionId}_`,
            `DECISION_${intersectionId}_\uffff`
        );

        let lastPhase = null;
        let lastTimestamp = null;
        let lastDecisionTimestamp = 0;
        let result = await lastDecisionIter.next();

        while (!result.done) {
            if (result.value && result.value.key && !result.value.key.startsWith('HASH_')) {
                const valueString = result.value.value.toString('utf8');
                if (valueString) {
                    try {
                        const lastDec = JSON.parse(valueString);
                        const decTimestamp = new Date(lastDec.timestamp).getTime();

                        if (lastDec.densityNS !== undefined && decTimestamp > lastDecisionTimestamp) {
                            lastPhase = lastDec.phase;
                            lastTimestamp = lastDec.timestamp;
                            lastDecisionTimestamp = decTimestamp;
                        }
                    } catch (err) {
                        console.error(`Failed to parse last decision: ${err.message}`);
                    }
                }
            }
            result = await lastDecisionIter.next();
        }
        await lastDecisionIter.close();

        let currentPhase;
        let greenDuration;
        let algorithm = 'ADAPTIVE';
        let reason = '';

        if (isEmergency) {
            currentPhase = emergencyDirection;
            greenDuration = 120;
            algorithm = 'EMERGENCY_OVERRIDE';
            reason = `🚨 EMERGENCY: ${emergencyVehicleType} vehicle priority in ${emergencyDirection} direction`;
            
            console.log(`🚨 EMERGENCY MODE: Granting ${greenDuration}s to ${emergencyDirection} for ${emergencyVehicleType}`);
        }
        else if (!lastPhase) {
            currentPhase = densityNS >= densityEW ? 'NS' : 'EW';
            
            // Apply adaptive algorithm even for initial phase
            const activeDensity = currentPhase === 'NS' ? densityNS : densityEW;
            const waitingDensity = currentPhase === 'NS' ? densityEW : densityNS;
            const totalDensity = densityNS + densityEW || 1;
            
            const ratio = activeDensity / totalDensity;
            const baseDuration = 30 + (ratio * 70);
            const waitingRatio = waitingDensity / totalDensity;
            const waitingBonus = waitingRatio * 20;
            
            greenDuration = Math.round(Math.min(120, baseDuration + waitingBonus));
            reason = `Initial phase selection: ${currentPhase} (NS=${densityNS}, EW=${densityEW})`;
        } else {
            const txTimestamp = ctx.stub.getTxTimestamp();
            const now = txTimestamp.seconds.low * 1000;
            const elapsed = lastTimestamp ? (now - new Date(lastTimestamp).getTime()) / 1000 : 0;
            const MIN_PHASE_TIME = 20;

            const currentPhaseDensity = lastPhase === 'NS' ? densityNS : densityEW;
            const waitingPhaseDensity = lastPhase === 'NS' ? densityEW : densityNS;

            if (elapsed < MIN_PHASE_TIME) {
                currentPhase = lastPhase;
                reason = `Minimum phase time not reached (${Math.round(elapsed)}s/${MIN_PHASE_TIME}s)`;
            } else if (waitingPhaseDensity > currentPhaseDensity * 1.5) {
                currentPhase = lastPhase === 'NS' ? 'EW' : 'NS';
                reason = `Switching: waiting direction has ${waitingPhaseDensity} vs current ${currentPhaseDensity}`;
            } else if (currentPhaseDensity < 10) {
                currentPhase = lastPhase === 'NS' ? 'EW' : 'NS';
                reason = `Low traffic in current direction (${currentPhaseDensity})`;
            } else {
                currentPhase = lastPhase;
                reason = `Maintaining phase: current=${currentPhaseDensity}, waiting=${waitingPhaseDensity}`;
            }

            const activeDensity = currentPhase === 'NS' ? densityNS : densityEW;
            const waitingDensity = currentPhase === 'NS' ? densityEW : densityNS;
            const totalDensity = densityNS + densityEW || 1;

            // Hybrid Weighted + Waiting Time Algorithm
            const ratio = activeDensity / totalDensity;
            const baseDuration = 30 + (ratio * 70); // 30-100s based on ratio

            // Add waiting bonus for other direction
            const waitingRatio = waitingDensity / totalDensity;
            const waitingBonus = waitingRatio * 20; // Up to +20s

            greenDuration = Math.round(Math.min(120, baseDuration + waitingBonus));
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();

        const decision = {
            intersectionId,
            greenDuration,
            phase: currentPhase,
            timestamp,
            priorityReason: densityNS > 50 || densityEW > 50 ? 'HIGH_DENSITY' : 'NORMAL',
            algorithm,
            densityNS,
            densityEW,
            algorithmReason: reason,
            isEmergency,
            emergencyVehicleType: emergencyVehicleType || null
        };

        const decKey = `DECISION_${intersectionId}_${ctx.stub.getTxID()}`;
        await ctx.stub.putState(decKey, Buffer.from(JSON.stringify(decision)));

        const sha = crypto.createHash('sha256').update(JSON.stringify(decision)).digest('hex');
        await ctx.stub.putState(`HASH_${decKey}`, Buffer.from(sha));

        await ctx.stub.setEvent('DecisionCreated', Buffer.from(JSON.stringify({
            decisionKey: decKey,
            decision,
            sha
        })));
        
        return JSON.stringify(decision);
    }

    async GetLatestDecision(ctx, intersectionId) {
        const iter = await ctx.stub.getStateByRange(`DECISION_${intersectionId}_`, `DECISION_${intersectionId}_\uffff`);
        let latest = null;
        let latestTimestamp = 0;

        while (true) {
            const res = await iter.next();
            if (res.done) break;

            if (res.value && res.value.key && !res.value.key.startsWith('HASH_')) {
                const valueString = res.value.value.toString('utf8');
                if (valueString) {
                    try {
                        const decision = JSON.parse(valueString);
                        const decTimestamp = new Date(decision.timestamp).getTime();

                        if (decision.densityNS !== undefined && decTimestamp > latestTimestamp) {
                            latest = decision;
                            latestTimestamp = decTimestamp;
                        }
                    } catch (err) {
                        console.error(`Failed to parse decision: ${err.message}`);
                    }
                }
            }
        }
        await iter.close();
        return JSON.stringify(latest || {});
    }

    async GetEmergencyHistory(ctx, intersectionId, startTime, endTime) {
        const start = startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const end = endTime || new Date().toISOString();

        const iter = await ctx.stub.getStateByRange(
            `EMERGENCY_${intersectionId}_`,
            `EMERGENCY_${intersectionId}_\uffff`
        );

        const history = [];
        let result = await iter.next();

        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                try {
                    const emergency = JSON.parse(result.value.value.toString('utf8'));
                    history.push(emergency);
                } catch (err) {
                    console.error('Error parsing emergency history:', err.message);
                }
            }
            result = await iter.next();
        }
        await iter.close();

        return JSON.stringify(history);
    }
}

module.exports = TrafficContract;
