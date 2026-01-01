'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, '..', 'hyperledger-fabric', 'fabric-samples', 
            'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 
            'connection-org1.json');
        
        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Connection profile not found at: ${ccpPath}`);
        }
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`✅ Wallet path: ${walletPath}`);

        // Check if user already exists
        const userIdentity = await wallet.get('appUser');
        if (userIdentity) {
            console.log('⚠️  User "appUser" already exists in wallet');
            return;
        }

        // Check if admin exists
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('❌ Admin identity not found. Run enrollAdmin.js first');
            return;
        }

        // Build an admin user object
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register the user
        console.log('📝 Registering user "appUser"...');
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser',
            role: 'client'
        }, adminUser);

        // Enroll the user
        console.log('🔐 Enrolling user "appUser"...');
        const enrollment = await ca.enroll({
            enrollmentID: 'appUser',
            enrollmentSecret: secret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put('appUser', x509Identity);
        console.log('✅ Successfully enrolled user "appUser" and imported to wallet');

    } catch (error) {
        console.error(`❌ Failed to enroll user: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
