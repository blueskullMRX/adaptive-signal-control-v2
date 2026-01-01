'use strict';

const { Wallets } = require('fabric-network');
const path = require('path');

async function main() {
    try {
        console.log('🔍 Checking wallet identities...');
        
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        const identities = await wallet.list();
        console.log(`📁 Wallet contains ${identities.length} identities:`);
        
        for (const id of identities) {
            const identity = await wallet.get(id);
            console.log(`   - ${id}: ${identity.type} (MSP: ${identity.mspId})`);
        }
        
    } catch (error) {
        console.error(`❌ Failed to check identities: ${error}`);
    }
}

main();

