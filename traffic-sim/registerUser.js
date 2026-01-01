'use strict';

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log('👤 Starting user registration...');
        
        // Load the connection profile
        const ccpPath = path.resolve(__dirname, 'connection.json');
        if (!fs.existsSync(ccpPath)) {
            throw new Error('Connection profile not found at ' + ccpPath);
        }
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for interacting with the CA
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { 
            trustedRoots: caTLSCACerts,
            verify: false 
        }, caInfo.caName);

        // Create a new file system based wallet for managing identities
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user
        const userIdentity = await wallet.get('appUser');
        if (userIdentity) {
            console.log('✅ User identity "appUser" already exists in the wallet');
            return;
        }

        // Check to see if we've already enrolled the admin user
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('❌ Admin identity "admin" does not exist in the wallet');
            console.log('💡 Please run enrollAdmin.js first');
            process.exit(1);
        }

        // Build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register the user, enroll the user, and import the new identity into the wallet
        console.log('Registering user...');
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser',
            role: 'client'
        }, adminUser);

        console.log(`✅ Successfully registered user "appUser" - secret: ${secret}`);

        // Enroll the user with the CA
        console.log('Enrolling user...');
        const enrollment = await ca.enroll({
            enrollmentID: 'appUser',
            enrollmentSecret: secret
        });

        // Create the user identity
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        // Import the user identity into the wallet
        await wallet.put('appUser', x509Identity);
        console.log('✅ Successfully enrolled user "appUser" and imported it into the wallet');

    } catch (error) {
        console.error(`❌ Failed to register user "appUser": ${error}`);
        process.exit(1);
    }
}

main();
