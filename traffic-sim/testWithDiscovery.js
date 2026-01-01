const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function testWithDiscovery() {
    let gateway;
    try {
        console.log('🔧 Testing with discovery enabled...');
        
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
            discovery: { 
                enabled: true,  // Try with discovery enabled
                asLocalhost: true 
            },
            eventHandlerOptions: {
                commitTimeout: 300,
                strategy: null
            }
        });
        
        console.log('✅ Gateway connection successful');
        
        const network = await gateway.getNetwork('mychannel');
        console.log('✅ Channel connection successful');
        
        const contract = network.getContract('traficCC');
        
        // Test query
        const result = await contract.evaluateTransaction('GetLatestDecision', 'A');
        console.log('🎉 Query successful! Result:', result.toString());
        
        gateway.disconnect();
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        if (gateway) gateway.disconnect();
    } finally {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
}

testWithDiscovery();
