'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { Gateway, Wallets } = require('fabric-network');

const app = express();
const PORT = 3000;
app.use(express.static(path.join(__dirname, 'public')));

// Connect to the network and get the contract
async function connect() {
    let gateway;
    try {
        console.log('🔗 Connecting to Fabric network...');
        
        const ccpPath = path.resolve(__dirname, 'connection.json');
        if (!fs.existsSync(ccpPath)) {
            throw new Error('Connection profile not found at ' + ccpPath);
        }
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const identityName = 'appUser';
        
        console.log(`🔍 Checking for identity: ${identityName}`);
        const identity = await wallet.get(identityName);
        if (!identity) {
            throw new Error(`Identity ${identityName} not found in wallet`);
        }
        
        console.log('✅ Identity found, connecting to gateway...');
        gateway = new Gateway();
        
        process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        
        await gateway.connect(ccp, {
            wallet,
            identity: identityName,
            discovery: { enabled: false, asLocalhost: true },
            eventHandlerOptions: { commitTimeout: 300, strategy: null }
        });

        console.log('✅ Connected to gateway, getting network...');
        const network = await gateway.getNetwork('mychannel');
        console.log('✅ Connected to channel: mychannel');
        
        const contract = network.getContract('traficCC');
        console.log('✅ Contract traficCC loaded');
        
        return { gateway, contract };
        
    } catch (error) {
        console.error('❌ Failed to connect to Fabric network:', error.message);
        if (gateway) gateway.disconnect();
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        throw error;
    }
}

// Try to get all available data
async function exploreChaincode(contract) {
    console.log('\n🔍 Exploring chaincode functions...');
    const intersections = ['A', 'B', 'C'];
    
    for (const id of intersections) {
        try {
            console.log(`\n📊 Checking intersection ${id}:`);
            
            // Try to get latest decision
            const latestDecision = await contract.evaluateTransaction('GetLatestDecision', id);
            console.log(`   Latest Decision Key: ${latestDecision.toString()}`);
            
            // Try to get the actual decision data using the key
            if (latestDecision.toString()) {
                try {
                    const decisionData = await contract.evaluateTransaction('GetDecision', latestDecision.toString());
                    console.log(`   Decision Data: ${decisionData.toString()}`);
                } catch (e) {
                    console.log(`   No detailed data for key: ${latestDecision.toString()}`);
                }
            }
            
            // Try to get sensor data
            try {
                const sensorData = await contract.evaluateTransaction('GetSensorData', id);
                console.log(`   Sensor Data: ${sensorData.toString()}`);
            } catch (e) {
                console.log(`   No sensor data available`);
            }
            
        } catch (err) {
            console.log(`   No data available for ${id}`);
        }
    }
}

// Initialize ledger
async function initLedger(contract) {
    try {
        console.log('📄 Initializing ledger...');
        await contract.submitTransaction('InitLedger');
        console.log('✅ Ledger initialized');
    } catch (err) {
        console.log('⚠️ Ledger initialization skipped:', err.message);
    }
}

// Enhanced simulation with better logging
async function simulate(contract) {
    const intersections = ['A', 'B', 'C'];
    
    console.log('\n🚦 Starting enhanced traffic simulation...');
    
    // First exploration
    await exploreChaincode(contract);
    
    setInterval(async () => {
        console.log('\n' + '='.repeat(50));
        console.log('🔄 New Simulation Cycle');
        console.log('='.repeat(50));
        
        for (const id of intersections) {
            try {
                const density = Math.floor(Math.random() * 100);
                const speed = Math.floor(Math.random() * 80) + 20; // 20-100 km/h
                const vehicles = Math.floor(Math.random() * 50) + 1; // 1-50 vehicles
                
                console.log(`\n🚦 [${id}] Traffic Update:`);
                console.log(`   Density: ${density}% | Speed: ${speed}km/h | Vehicles: ${vehicles}`);
                
                const sensorJSON = JSON.stringify({ 
                    density, 
                    speed, 
                    vehicles,
                    timestamp: new Date().toISOString()
                });

                // Submit sensor data
                await contract.submitTransaction('SubmitSensorData', id, sensorJSON);
                console.log(`   ✅ Sensor data submitted`);

                // Compute traffic decision
                const decisionKey = await contract.submitTransaction('ComputeDecision', id);
                console.log(`   🟢 Decision computed: ${decisionKey.toString()}`);

                // Try to get the actual decision
                try {
                    const decision = await contract.evaluateTransaction('GetLatestDecision', id);
                    const decisionStr = decision.toString();
                    if (decisionStr && decisionStr !== '') {
                        console.log(`   📊 Latest decision: ${decisionStr}`);
                        
                        // Try to get detailed decision data
                        try {
                            const decisionData = await contract.evaluateTransaction('GetDecision', decisionStr);
                            console.log(`   📋 Decision details: ${decisionData.toString()}`);
                        } catch (e) {
                            // If GetDecision fails, the key might be the decision itself
                            console.log(`   ℹ️ Decision: ${decisionStr}`);
                        }
                    }
                } catch (e) {
                    console.log(`   📊 No decision available yet`);
                }
                
            } catch (err) {
                console.error(`❌ Operation failed for ${id}:`, err.message);
            }
        }
        
        console.log('\n⏰ Next update in 15 seconds...');
    }, 15000);
}

// Serve front-end
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Enhanced API endpoint
app.get('/api/decisions', async (req, res) => {
    let gateway;
    try {
        const { gateway: gw, contract } = await connect();
        gateway = gw;
        
        const intersections = ['A', 'B', 'C'];
        const trafficData = {};
        
        for (const id of intersections) {
            try {
                const decision = await contract.evaluateTransaction('GetLatestDecision', id);
                trafficData[id] = {
                    decisionKey: decision.toString(),
                    timestamp: new Date().toISOString()
                };
                
                // Try to get sensor data
                try {
                    const sensorData = await contract.evaluateTransaction('GetSensorData', id);
                    trafficData[id].sensorData = JSON.parse(sensorData.toString());
                } catch (e) {
                    trafficData[id].sensorData = 'No sensor data';
                }
                
            } catch (err) {
                trafficData[id] = { error: 'No data available' };
            }
        }
        
        gateway.disconnect();
        res.json({
            status: 'success',
            timestamp: new Date().toISOString(),
            data: trafficData
        });
    } catch (error) {
        if (gateway) gateway.disconnect();
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Enhanced Traffic Simulation'
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Enhanced Server running on http://localhost:3000`);
    console.log('🔧 Starting Fabric connection...');
    
    try {
        const { gateway, contract } = await connect();
        console.log('🎯 Connected to Fabric network successfully!');
        
        await initLedger(contract);
        await simulate(contract);
        
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down...');
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            gateway.disconnect();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('💥 Failed to start application:', error);
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        process.exit(1);
    }
});
