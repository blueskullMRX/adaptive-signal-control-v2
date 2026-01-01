const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

// Check if function already exists
if (content.includes('async function updateIntersectionState')) {
    console.log('✅ Function already exists');
    process.exit(0);
}

// Find the emergency endpoints section
const marker = '// ========================================\n// EMERGENCY VEHICLE ENDPOINTS\n// ========================================';
const insertIndex = content.indexOf(marker);

if (insertIndex === -1) {
    console.log('❌ Could not find emergency endpoints section');
    process.exit(1);
}

// Function to add
const updateFunc = `
// Helper function to update intersection state from blockchain
async function updateIntersectionState(intersectionId) {
    try {
        const decisionResult = await globalContract.submitTransaction('ComputeDecision', intersectionId);
        const decision = JSON.parse(decisionResult.toString());
        
        intersections[intersectionId].decision = decision;
        intersections[intersectionId].densityNS = decision.densityNS;
        intersections[intersectionId].densityEW = decision.densityEW;
        
        console.log(\`🔄 [\${intersectionId}] Updated - Phase: \${decision.phase}, Duration: \${decision.greenDuration}s\`);
        if (decision.isEmergency) {
            console.log(\`🚨 [\${intersectionId}] EMERGENCY MODE: \${decision.emergencyVehicleType}\`);
        }
        
        broadcastState();
    } catch (error) {
        console.error(\`❌ Failed to update intersection \${intersectionId}:\`, error.message);
    }
}

`;

// Insert the function
content = content.slice(0, insertIndex) + updateFunc + content.slice(insertIndex);

// Write back
fs.writeFileSync('app.js', content);
console.log('✅ Added updateIntersectionState function successfully');
