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

        // Check if admin already exists
        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            console.log('⚠️  Admin identity already exists in wallet');
            return;
        }

        // Enroll the admin user
        console.log('🔐 Enrolling admin user...');
        const enrollment = await ca.enroll({ 
            enrollmentID: 'admin', 
            enrollmentSecret: 'adminpw' 
        });
        
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        
        await wallet.put('admin', x509Identity);
        console.log('✅ Successfully enrolled admin user and imported to wallet');

    } catch (error) {
        console.error(`❌ Failed to enroll admin: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
