const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function debugChaincode() {
    let gateway;
    try {
        console.log('🔍 Debugging Chaincode Functions...\n');
        
        // Set environment variables
        process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        
        const ccpPath = path.resolve(__dirname, 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        const identity = await wallet.get('appUser');
        if (!identity) {
            throw new Error('appUser identity not found');
        }
        
        gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'appUser',
            discovery: { enabled: false, asLocalhost: true }
        });

        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('traficCC');
        
        console.log('✅ Connected to chaincode: traficCC\n');
        
        // Test basic chaincode functions
        console.log('1. Testing InitLedger...');
        try {
            await contract.submitTransaction('InitLedger');
            console.log('   ✅ InitLedger executed successfully');
        } catch (err) {
            console.log('   ⚠️ InitLedger failed:', err.message);
        }
        
        // Test submitting sensor data
        console.log('\n2. Testing SubmitSensorData for intersection A...');
        try {
            const sensorData = JSON.stringify({ 
                density: 75, 
                speed: 45, 
                vehicles: 12,
                timestamp: new Date().toISOString()
            });
            await contract.submitTransaction('SubmitSensorData', 'A', sensorData);
            console.log('   ✅ Sensor data submitted successfully');
        } catch (err) {
            console.log('   ❌ SubmitSensorData failed:', err.message);
        }
        
        // Test getting sensor data
        console.log('\n3. Testing GetSensorData for intersection A...');
        try {
            const result = await contract.evaluateTransaction('GetSensorData', 'A');
            console.log('   ✅ GetSensorData result:', result.toString());
        } catch (err) {
            console.log('   ❌ GetSensorData failed:', err.message);
        }
        
        // Test computing decision
        console.log('\n4. Testing ComputeDecision for intersection A...');
        try {
            const result = await contract.submitTransaction('ComputeDecision', 'A');
            console.log('   ✅ ComputeDecision result:', result.toString());
        } catch (err) {
            console.log('   ❌ ComputeDecision failed:', err.message);
        }
        
        // Test getting latest decision
        console.log('\n5. Testing GetLatestDecision for intersection A...');
        try {
            const result = await contract.evaluateTransaction('GetLatestDecision', 'A');
            console.log('   ✅ GetLatestDecision result:', result.toString());
        } catch (err) {
            console.log('   ❌ GetLatestDecision failed:', err.message);
        }
        
        // Try to get all decisions
        console.log('\n6. Testing GetAllDecisions for intersection A...');
        try {
            const result = await contract.evaluateTransaction('GetAllDecisions', 'A');
            console.log('   ✅ GetAllDecisions result:', result.toString());
        } catch (err) {
            console.log('   ⚠️ GetAllDecisions failed (might not exist):', err.message);
        }
        
        // Try to get decision by key
        console.log('\n7. Testing GetDecision with a key...');
        try {
            // First compute a decision to get a key
            const keyResult = await contract.submitTransaction('ComputeDecision', 'A');
            const decisionKey = keyResult.toString();
            console.log('   Decision key:', decisionKey);
            
            const result = await contract.evaluateTransaction('GetDecision', decisionKey);
            console.log('   ✅ GetDecision result:', result.toString());
        } catch (err) {
            console.log('   ❌ GetDecision failed:', err.message);
        }
        
        // Try to query all data
        console.log('\n8. Testing QueryAllData...');
        try {
            const result = await contract.evaluateTransaction('QueryAllData');
            console.log('   ✅ QueryAllData result:', result.toString());
        } catch (err) {
            console.log('   ⚠️ QueryAllData failed (might not exist):', err.message);
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    } finally {
        if (gateway) {
            gateway.disconnect();
        }
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
}

debugChaincode();
