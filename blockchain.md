# Smart Traffic Control System with Emergency Vehicle Priority

A blockchain-based adaptive traffic signal control system using Hyperledger Fabric, featuring real-time emergency vehicle priority routing.

> **Note:** This project uses the default Hyperledger Fabric test network (`test-network`) with the standard `asset-transfer-basic` chaincode structure. We will replace the default chaincode with our custom traffic control chaincode.

## 🏗️ Architecture

- **Blockchain Network**: Hyperledger Fabric 2.5.0 (2 organizations, 1 orderer)
- **Backend**: Node.js/Express with WebSocket support
- **Frontend**: React + TypeScript + Vite
- **Smart Contract**: JavaScript chaincode for traffic decisions and emergency handling

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (v16+ or v18+)
- **npm** (v8+)
- **Git**
- **curl**

## 🚀 Quick Start Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/blueskullMRX/adaptive-signal-control-v2.git
cd adaptive-signal-control
```

### Step 2: Install Hyperledger Fabric

```bash
# Create fabric directory
mkdir -p ~/hyperledger-fabric
cd ~/hyperledger-fabric

# Download Fabric samples, binaries, and Docker images
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
./install-fabric.sh docker samples binary

# Verify installation
cd fabric-samples/test-network
./network.sh --help
```

### Step 3: Replace Default Chaincode with Traffic Control Chaincode

```bash
# Navigate to the default chaincode directory
cd ~/hyperledger-fabric/fabric-samples/asset-transfer-basic/chaincode-javascript

# Backup the original chaincode (optional)
mv index.js index.js.backup
mv lib lib.backup

# Copy your traffic control chaincode files into the default chaincode directory
cp ~/adaptive-signal-control/chaincode-javascript/* ~/hyperledger-fabric/fabric-samples/asset-transfer-basic/chaincode-javascript/

# Verify the files are in place
ls -la
```

You should see `index.js`, `traficCC.js`, and `package.json` in the directory.

### Step 4: Start the Blockchain Network

```bash
cd ~/hyperledger-fabric/fabric-samples/test-network

# Start the network with Certificate Authorities
./network.sh up createChannel -c mychannel -ca

# Verify network is running
docker ps
```

You should see containers for:
- `peer0.org1.example.com`
- `peer0.org2.example.com`
- `orderer.example.com`
- `ca_org1`, `ca_org2`, `ca_orderer`

### Step 5: Deploy the Chaincode

```bash
cd ~/hyperledger-fabric/fabric-samples/test-network

# Set environment variables
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/

# Package the chaincode
peer lifecycle chaincode package traffic.tar.gz \
  --path ../asset-transfer-basic/chaincode-javascript/ \
  --lang node \
  --label traffic_1.0

# Install on Org1
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode install traffic.tar.gz

# Install on Org2
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
peer lifecycle chaincode install traffic.tar.gz

# Query installed chaincode and get package ID
peer lifecycle chaincode queryinstalled
```

Copy the Package ID from the output (looks like `traffic_1.0:xxxxx...`)

```bash
# Export the package ID (replace with your actual package ID)
export CC_PACKAGE_ID=traffic_1.0:YOUR_PACKAGE_ID_HERE

# Approve for Org2
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name traffic \
  --version 1.0 \
  --package-id $CC_PACKAGE_ID \
  --sequence 1 \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Approve for Org1
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name traffic \
  --version 1.0 \
  --package-id $CC_PACKAGE_ID \
  --sequence 1 \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Commit the chaincode
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name traffic \
  --version 1.0 \
  --sequence 1 \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"

# Verify deployment
peer lifecycle chaincode querycommitted --channelID mychannel --name traffic
```

### Step 6: Setup Backend

```bash
cd ~/adaptive-signal-control/traffic-sim

# Install dependencies
npm install

# Enroll admin user
node enrollAdmin.js

# Enroll application user
node enrollUser.js

# Start the backend server
node app.js
```

The backend will start on `http://localhost:3000`

### Step 7: Setup Frontend

Open a new terminal:

```bash
cd ~/adaptive-signal-control/traffic-sim-frontend-new

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:5173`

### Step 8: Access the Application

Open your browser and navigate to: `http://localhost:5173`

## 🚦 Features

### Adaptive Traffic Control
- Real-time traffic density monitoring for 3 intersections (A, B, C)
- Blockchain-recorded traffic decisions
- Adaptive signal timing based on traffic load

### Emergency Vehicle Priority
- **Priority Levels**:
  - 🚓 POLICE (Priority 1 - Highest)
  - 🚒 FIRE_TRUCK (Priority 2)
  - 🚑 AMBULANCE (Priority 3)
- **Features**:
  - Immediate traffic light override (120s green duration vs 60s normal)
  - Real-time emergency alerts with pulse animation
  - Blockchain-logged emergency events
  - 5-minute auto-expiration with manual clear option
  - WebSocket broadcasting for instant updates

## 🔧 Testing Emergency System

1. **Trigger an Emergency**:
   - Click any emergency button (AMBULANCE, FIRE_TRUCK, POLICE) for North-South or East-West direction
   - Observe the red emergency alert banner appear
   - Traffic light should immediately turn green for the emergency direction

2. **Clear an Emergency**:
   - Emergency automatically expires after 5 minutes
   - Manual clearing happens when backend restarts

3. **Verify Blockchain Logging**:
   ```bash
   # Query active emergencies
   cd ~/hyperledger-fabric/fabric-samples/test-network
   export PATH=${PWD}/../bin:$PATH
   export FABRIC_CFG_PATH=${PWD}/../config/
   export CORE_PEER_ADDRESS=localhost:7051
   export CORE_PEER_LOCALMSPID="Org1MSP"
   export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
   export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
   
   peer chaincode query -C mychannel -n traffic -c '{"function":"GetActiveEmergencies","Args":[]}'
   ```

##  Chaincode Functions

- `InitLedger()` - Initialize ledger with default intersection states
- `SubmitSensorData(intersectionId, nsDensity, ewDensity)` - Submit traffic sensor data
- `ComputeDecision(intersectionId)` - Calculate optimal traffic light decision
- `SubmitEmergencyRequest(intersectionId, direction, vehicleType)` - Create emergency override
- `GetActiveEmergencies()` - Query all active emergency requests
- `ClearEmergencyRequest(emergencyId)` - Mark emergency as cleared
- `GetEmergencyHistory(intersectionId)` - Query past emergencies for intersection

## 🛠️ Troubleshooting

### Network Issues

```bash
# Stop and restart the network
cd ~/hyperledger-fabric/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -c mychannel -ca

# Redeploy chaincode (follow Step 5 again)
```

### Backend Connection Issues

```bash
# Check if wallet exists
ls ~/adaptive-signal-control/traffic-sim/wallet

# Re-enroll users if needed
cd ~/adaptive-signal-control/traffic-sim
rm -rf wallet
node enrollAdmin.js
node enrollUser.js
```

### Port Already in Use

```bash
# Kill processes on specific ports
sudo lsof -ti:3000 | xargs kill -9  # Backend
sudo lsof -ti:5173 | xargs kill -9  # Frontend
```

### View Container Logs

```bash
# View peer logs
docker logs peer0.org1.example.com

# View chaincode logs
docker logs <chaincode-container-id>
```

## 📝 API Endpoints

### Backend API (Port 3000)

- `GET /api/intersections/:id/state` - Get current intersection state
- `POST /api/emergency/:intersectionId` - Submit emergency request
  ```json
  {
    "direction": "NS" | "EW",
    "vehicleType": "AMBULANCE" | "FIRE_TRUCK" | "POLICE"
  }
  ```

### WebSocket Events

- `intersectionUpdate` - Traffic light state changes
- `EMERGENCY_ALERT` - Emergency triggered/cleared

## 🔐 Security Notes

- Certificate authorities (CAs) manage identity enrollment
- TLS enabled for all peer communications
- Admin/User identities stored in local wallet
- Do not commit `wallet/` directory to version control

## 📚 Resources

- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
- [Fabric Test Network Tutorial](https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html)
- [React Documentation](https://react.dev/)
- [Node.js Fabric SDK](https://hyperledger.github.io/fabric-sdk-node/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request


## 👥 Authors

- blueskull - Initial work

## 🙏 Acknowledgments

- Hyperledger Fabric community
- IBM Blockchain samples