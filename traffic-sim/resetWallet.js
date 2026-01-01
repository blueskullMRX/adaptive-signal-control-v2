'use strict';

const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log('🔄 Resetting wallet...');
        
        const walletPath = path.join(process.cwd(), 'wallet');
        
        if (fs.existsSync(walletPath)) {
            fs.rmSync(walletPath, { recursive: true, force: true });
            console.log('✅ Wallet reset successfully');
        } else {
            console.log('ℹ️  Wallet directory does not exist');
        }
        
    } catch (error) {
        console.error(`❌ Failed to reset wallet: ${error}`);
    }
}

main();
