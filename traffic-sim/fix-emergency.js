const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

// Fix 1: Clear emergency - fix the key access
content = content.replace(
    /for \(const emergency of emergencies\) {\s+try {\s+await globalContract\.submitTransaction\('ClearEmergencyRequest', emergency\.key\);/g,
    `for (const emergency of emergencies) {
                    try {
                        const key = emergency.Key || emergency.key || JSON.stringify(emergency);
                        await globalContract.submitTransaction('ClearEmergencyRequest', key);`
);

// Fix 2: Add emergency override flag to state
const stateCreation = content.indexOf('function createIntersectionState(id) {');
if (stateCreation > 0) {
    const returnIndex = content.indexOf('return {', stateCreation);
    const closeBrace = content.indexOf('};', returnIndex);
    
    if (!content.substring(returnIndex, closeBrace).includes('emergencyOverride')) {
        const insertion = content.substring(returnIndex, closeBrace) + ',\n        emergencyOverride: false';
        content = content.substring(0, returnIndex) + 
                  content.substring(returnIndex, closeBrace).replace(
                      /densityEW: 50,[\s\n]+decision: null/,
                      'densityEW: 50,\n        decision: null,\n        emergencyOverride: false'
                  ) + 
                  content.substring(closeBrace);
    }
}

// Fix 3: Set emergency flag in updateIntersectionState
content = content.replace(
    /intersections\[intersectionId\]\.decision = decision;/g,
    `intersections[intersectionId].decision = decision;
        intersections[intersectionId].emergencyOverride = decision.isEmergency || false;`
);

fs.writeFileSync('app.js', content);
console.log('✅ Applied all emergency fixes');
