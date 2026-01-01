const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function testFinal() {
    let gateway;
    try {
        console.log('🔧 Final connection test with correct certificates...');
        
        // Set environment variables to help with TLS issues
        process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Disable TLS verification
        
        const ccpPath = path.resolve(__dirname, 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log('✅ Connection profile loaded');
        
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log('✅ Wallet accessed');
        
        const identity = await wallet.get('appUser');
        if (!identity) {
            throw new Error('appUser identity not found');
        }
        console.log('✅ Identity found');
        
        gateway = new Gateway();
        
        console.log('🔄 Connecting to gateway...');
        await gateway.connect(ccp, {
            wallet,
            identity: 'appUser',
            discovery: { 
                enabled: false,  // Critical: disable discovery
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
        console.log('✅ Contract loaded');
        
        // Test a simple query
        console.log('🔄 Testing query...');
        const result = await contract.evaluateTransaction('GetLatestDecision', 'A');
        console.log('🎉 Query successful! Result:', result.toString());
        
        gateway.disconnect();
        console.log('✅ Gateway disconnected');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        if (gateway) {
            gateway.disconnect();
        }
    } finally {
        // Restore environment
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
}

testFinal();
