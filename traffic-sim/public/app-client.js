let stats = {
    totalDecisions: 0,
    totalDuration: 0,
    totalDensity: 0,
    phaseSwitches: 0,
    lastPhases: { A: null, B: null, C: null }
};

// Traffic light state management with transition tracking
let trafficStates = {
    A: { currentPhase: null, targetPhase: null, timeRemaining: 0, state: 'RED', lastUpdate: Date.now(), inTransition: false, greenDuration: 60 },
    B: { currentPhase: null, targetPhase: null, timeRemaining: 0, state: 'RED', lastUpdate: Date.now(), inTransition: false, greenDuration: 60 },
    C: { currentPhase: null, targetPhase: null, timeRemaining: 0, state: 'RED', lastUpdate: Date.now(), inTransition: false, greenDuration: 60 }
};

// Constants for realistic timing
const YELLOW_DURATION = 3; // 3 seconds yellow light
const ALL_RED_DURATION = 2; // 2 seconds all-red for safety
const MIN_GREEN = 10; // Minimum green time

function updateStatus(online) {
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    
    if (online) {
        indicator.classList.add('online');
        text.textContent = 'System Online';
    } else {
        indicator.classList.remove('online');
        text.textContent = 'Connecting...';
    }
}

function updateTrafficLightState(intersection, blockchainPhase, blockchainDuration) {
    const state = trafficStates[intersection];
    const now = Date.now();
    const elapsed = (now - state.lastUpdate) / 1000;
    
    // Update time remaining based on elapsed time
    if (state.timeRemaining > 0) {
        state.timeRemaining = Math.max(0, state.timeRemaining - elapsed);
    }
    state.lastUpdate = now;
    
    // Check if blockchain wants a different phase
    if (blockchainPhase !== state.targetPhase && !state.inTransition) {
        console.log(`[${intersection}] 🆕 Blockchain decision: switch to ${blockchainPhase} (${blockchainDuration}s)`);
        
        state.targetPhase = blockchainPhase;
        state.greenDuration = blockchainDuration;
        
        // If we have an active green phase and need to switch
        if (state.currentPhase && state.currentPhase !== blockchainPhase) {
            if (state.state === 'GREEN_NS' || state.state === 'GREEN_EW') {
                console.log(`[${intersection}] 🔄 Initiating transition: ${state.currentPhase} → ${blockchainPhase}`);
                state.inTransition = true;
                
                // Force transition to yellow
                state.state = state.currentPhase === 'NS' ? 'YELLOW_NS' : 'YELLOW_EW';
                state.timeRemaining = YELLOW_DURATION;
                console.log(`[${intersection}] 🟢→🟡 Forced yellow transition (${YELLOW_DURATION}s)`);
            }
        } else if (!state.currentPhase) {
            // First initialization - start with the blockchain phase
            console.log(`[${intersection}] 🎬 Initial phase: ${blockchainPhase} green (${blockchainDuration}s)`);
            state.currentPhase = blockchainPhase;
            state.state = blockchainPhase === 'NS' ? 'GREEN_NS' : 'GREEN_EW';
            state.timeRemaining = blockchainDuration;
        }
    }
    
    // State machine - handles transitions when time expires
    if (state.timeRemaining <= 0) {
        console.log(`[${intersection}] ⏰ Timer expired in state: ${state.state}`);
        
        switch(state.state) {
            case 'GREEN_NS':
            case 'GREEN_EW':
                // Green expired, go to yellow
                const dir = state.state === 'GREEN_NS' ? 'NS' : 'EW';
                console.log(`[${intersection}] 🟢→🟡 ${dir} green expired, going yellow`);
                state.state = state.state === 'GREEN_NS' ? 'YELLOW_NS' : 'YELLOW_EW';
                state.timeRemaining = YELLOW_DURATION;
                state.inTransition = true;
                break;
                
            case 'YELLOW_NS':
            case 'YELLOW_EW':
                // Yellow done, all-red clearance
                const yellowDir = state.state === 'YELLOW_NS' ? 'NS' : 'EW';
                console.log(`[${intersection}] 🟡→🔴 ${yellowDir} yellow done, all-red clearance`);
                state.state = state.state === 'YELLOW_NS' ? 'ALL_RED_TO_EW' : 'ALL_RED_TO_NS';
                state.timeRemaining = ALL_RED_DURATION;
                break;
                
            case 'ALL_RED_TO_EW':
            case 'ALL_RED_TO_NS':
                // All-red done, switch to new green phase
                const newPhase = state.state === 'ALL_RED_TO_EW' ? 'EW' : 'NS';
                console.log(`[${intersection}] 🔴→🟢 All-red done, ${newPhase} green (${state.greenDuration}s)`);
                
                state.currentPhase = newPhase;
                state.state = newPhase === 'NS' ? 'GREEN_NS' : 'GREEN_EW';
                state.timeRemaining = state.greenDuration;
                state.inTransition = false;
                break;
                
            default:
                // Default to red if unknown state
                console.log(`[${intersection}] ⚠️ Unknown state: ${state.state}, defaulting to red`);
                state.state = 'RED';
                state.timeRemaining = 2;
                break;
        }
    }
    
    // Render the lights
    renderTrafficLights(intersection, state);
}

function renderTrafficLights(intersection, state) {
    const lightContainer = document.getElementById(`light-${intersection}`);
    if (!lightContainer) return;
    
    const lights = lightContainer.querySelectorAll('.light');
    
    // Reset all lights
    lights.forEach(light => light.classList.remove('active'));
    
    // Activate correct light based on state
    if (state.state === 'GREEN_NS' || state.state === 'GREEN_EW') {
        lights[2].classList.add('active'); // Green
    } else if (state.state === 'YELLOW_NS' || state.state === 'YELLOW_EW') {
        lights[1].classList.add('active'); // Yellow
    } else {
        // All other states show red (ALL_RED_TO_*, RED, or unknown)
        lights[0].classList.add('active'); // Red
    }
    
    // Update countdown
    updateCountdown(intersection, state);
}

function updateCountdown(intersection, state) {
    const countdownElement = document.getElementById(`countdown-${intersection}`);
    if (!countdownElement) return;
    
    const timeLeft = Math.ceil(state.timeRemaining);
    let stateText = state.state;
    let emoji = '🔴';
    let color = '#f44336';
    
    // Format state text
    if (state.state.includes('GREEN')) {
        emoji = '🟢';
        color = '#4CAF50';
        stateText = state.state === 'GREEN_NS' ? 'NS Green' : 'EW Green';
    } else if (state.state.includes('YELLOW')) {
        emoji = '🟡';
        color = '#ff9800';
        stateText = state.state === 'YELLOW_NS' ? 'NS Yellow' : 'EW Yellow';
    } else if (state.state.includes('ALL_RED')) {
        emoji = '🔴';
        color = '#f44336';
        const target = state.state.includes('TO_EW') ? 'EW' : 'NS';
        stateText = `All Red → ${target}`;
    } else {
        emoji = '🔴';
        color = '#999';
        stateText = 'Red';
    }
    
    countdownElement.textContent = `${emoji} ${stateText}: ${timeLeft}s`;
    countdownElement.style.color = 'white';
    countdownElement.style.background = `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`;
}

function updateIntersection(intersection, data) {
    try {
        const decision = typeof data === 'string' ? JSON.parse(data) : data;
        
        if (!decision || !decision.phase) {
            console.warn(`Invalid data for intersection ${intersection}:`, data);
            return;
        }

        // Update traffic light state machine
        updateTrafficLightState(intersection, decision.phase, decision.greenDuration || 60);
        
        // Update phase badges
        const activeColor = decision.phase === 'NS' ? 'background: #4CAF50;' : 'background: #2196F3;';
        const inactivePhase = decision.phase === 'NS' ? 'EW' : 'NS';
        document.getElementById(`phase-${intersection}`).innerHTML = 
            `<span class="phase-badge" style="${activeColor}">🟢 ${decision.phase}</span>
             <span class="phase-badge" style="background: #f44336;">🔴 ${inactivePhase}</span>`;
        
        // Update densities
        const nsElement = document.getElementById(`ns-density-${intersection}`);
        const ewElement = document.getElementById(`ew-density-${intersection}`);
        
        nsElement.textContent = decision.densityNS !== undefined ? decision.densityNS : '--';
        ewElement.textContent = decision.densityEW !== undefined ? decision.densityEW : '--';
        
        if (decision.phase === 'NS') {
            nsElement.style.color = '#4CAF50';
            nsElement.style.fontWeight = 'bold';
            nsElement.style.fontSize = '1.2em';
            ewElement.style.color = '#999';
            ewElement.style.fontWeight = 'normal';
            ewElement.style.fontSize = '1em';
        } else {
            ewElement.style.color = '#2196F3';
            ewElement.style.fontWeight = 'bold';
            ewElement.style.fontSize = '1.2em';
            nsElement.style.color = '#999';
            nsElement.style.fontWeight = 'normal';
            nsElement.style.fontSize = '1em';
        }
        
        document.getElementById(`duration-${intersection}`).textContent = 
            decision.greenDuration ? `${decision.greenDuration}s` : '--';
        
        const priorityBadge = document.getElementById(`priority-${intersection}`);
        priorityBadge.textContent = decision.priorityReason || '--';
        priorityBadge.className = `priority-badge ${decision.priorityReason || ''}`;
        
        document.getElementById(`reason-${intersection}`).innerHTML = 
            `<small>📍 ${decision.algorithmReason || 'Calculating...'}</small>`;
        
        updateStats(intersection, decision);
        addActivity(intersection, decision);
        
    } catch (error) {
        console.error(`Error updating intersection ${intersection}:`, error);
    }
}

function updateStats(intersection, decision) {
    stats.totalDecisions++;
    
    if (decision.greenDuration) {
        stats.totalDuration += decision.greenDuration;
    }
    
    if (decision.densityNS !== undefined && decision.densityEW !== undefined) {
        stats.totalDensity += (decision.densityNS + decision.densityEW) / 2;
    }
    
    if (stats.lastPhases[intersection] && stats.lastPhases[intersection] !== decision.phase) {
        stats.phaseSwitches++;
    }
    stats.lastPhases[intersection] = decision.phase;
    
    document.getElementById('total-decisions').textContent = stats.totalDecisions;
    
    const avgDuration = stats.totalDecisions > 0 ? 
        Math.round(stats.totalDuration / stats.totalDecisions) : 0;
    document.getElementById('avg-duration').textContent = `${avgDuration}s`;
    
    const avgDensity = stats.totalDecisions > 0 ? 
        Math.round(stats.totalDensity / stats.totalDecisions) : 0;
    document.getElementById('avg-density').textContent = avgDensity;
    
    document.getElementById('phase-switches').textContent = stats.phaseSwitches;
}

function addActivity(intersection, decision) {
    const feed = document.getElementById('activity-feed');
    const timestamp = new Date().toLocaleTimeString();
    
    const phaseIcon = decision.phase === 'NS' ? '⬆️⬇️' : '⬅️➡️';
    const priorityIcon = decision.priorityReason === 'HIGH_DENSITY' ? '🔴' : '🟢';
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
        <div class="timestamp">${timestamp} ${priorityIcon}</div>
        <div class="message">
            <strong>Intersection ${intersection}:</strong> 
            ${phaseIcon} ${decision.phase} phase (${decision.greenDuration}s) - 
            NS:${decision.densityNS} EW:${decision.densityEW}<br>
            <small style="color: #666;">${decision.algorithmReason}</small>
        </div>
    `;
    
    feed.insertBefore(activityItem, feed.firstChild);
    
    while (feed.children.length > 20) {
        feed.removeChild(feed.lastChild);
    }
}

async function fetchDecisions() {
    try {
        const response = await fetch('/api/decisions');
        const decisions = await response.json();
        
        updateStatus(true);
        
        Object.keys(decisions).forEach(intersection => {
            updateIntersection(intersection, decisions[intersection]);
        });
        
    } catch (error) {
        console.error('Error fetching decisions:', error);
        updateStatus(false);
    }
}

// Update state machine every 100ms for smooth countdown
setInterval(() => {
    Object.keys(trafficStates).forEach(intersection => {
        const state = trafficStates[intersection];
        if (state.currentPhase || state.targetPhase) {
            updateTrafficLightState(intersection, state.targetPhase || state.currentPhase, state.greenDuration);
        }
    });
}, 100);

// Fetch blockchain decisions every 5 seconds
fetchDecisions();
setInterval(fetchDecisions, 5000);

updateStatus(false);

console.log('🚦 Smart Traffic Management Dashboard Loaded');
console.log('📡 Polling blockchain every 5 seconds');
console.log('⚡ State machine updates every 100ms');
console.log('🔄 Blockchain updates every 60 seconds');
console.log('');
console.log('State Flow: 🟢 GREEN → 🟡 YELLOW (3s) → 🔴 RED (2s) → 🟢 opposite GREEN');
