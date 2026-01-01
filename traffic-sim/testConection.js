const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function testConnection() {
    let gateway;
    try {
        console.log('🔧 Testing Fabric connection...');
        
        // Load connection profile
        const ccpPath = path.resolve(__dirname, 'connection.json');
        if (!fs.existsSync(ccpPath)) {
            throw new Error('Connection profile not found at ' + ccpPath);
        }
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log('✅ Connection profile loaded');
        
        // Check wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log('✅ Wallet accessed');
        
        const identity = await wallet.get('appUser');
        if (!identity) {
            throw new Error('appUser identity not found in wallet. Run: node enrollAdmin.js && node registerUser.js');
        }
        console.log('✅ Identity found in wallet');
        
        // Try to connect with discovery disabled
        console.log('🔄 Connecting to gateway...');
        gateway = new Gateway();
        
        await gateway.connect(ccp, {
            wallet,
            identity: 'appUser',
            discovery: { 
                enabled: false,  // Disable discovery to avoid issues
                asLocalhost: true 
            },
            eventHandlerOptions: {
                commitTimeout: 300,
                strategy: null
            }
        });
        
        console.log('✅ Gateway connection successful');
        
        // Try to get network
        console.log('🔄 Getting network...');
        const network = await gateway.getNetwork('mychannel');
        console.log('✅ Channel connection successful');
        
        // Try to get contract
        console.log('🔄 Getting contract...');
        const contract = network.getContract('traficCC');
        console.log('✅ Contract access successful');
        
        // Test a simple query
        console.log('🔄 Testing contract query...');
        const result = await contract.evaluateTransaction('GetLatestDecision', 'A');
        console.log('✅ Contract query successful:', result.toString());
        
        gateway.disconnect();
        console.log('🎉 All connection tests passed!');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        if (gateway) {
            gateway.disconnect();
        }
    }
}

testConnection();
