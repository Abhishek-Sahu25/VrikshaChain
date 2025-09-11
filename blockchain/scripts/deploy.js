/**
 * Robust deploy script (handles BatchToken 3-address ctor)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const hre = require('hardhat');
const { ethers } = hre;
const fs = require('fs');
const path = require('path');

function getConstructorInputs(contractFactory) {
  if (contractFactory.interface && contractFactory.interface.deployFunction && contractFactory.interface.deployFunction.inputs) {
    return contractFactory.interface.deployFunction.inputs;
  }
  if (contractFactory.interface && Array.isArray(contractFactory.interface.fragments)) {
    const ctor = contractFactory.interface.fragments.find(f => f.type === 'constructor');
    if (ctor && Array.isArray(ctor.inputs)) return ctor.inputs;
  }
  return [];
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer address:', deployer.address);

  const adminAddr = process.env.ADMIN_MULTISIG && process.env.ADMIN_MULTISIG.length > 0
    ? process.env.ADMIN_MULTISIG
    : deployer.address;
  console.log('Admin address (ADMIN_ROLE target):', adminAddr);

  // AccessRegistry
  const AccessRegistry = await ethers.getContractFactory('AccessRegistry');
  let access;
  if (process.env.EXISTING_ACCESS && process.env.EXISTING_ACCESS.length > 0) {
    access = AccessRegistry.attach(process.env.EXISTING_ACCESS);
    console.log('Reusing AccessRegistry at', access.address);
  } else {
    console.log('Deploying AccessRegistry...');
    access = await AccessRegistry.deploy(adminAddr);
    await access.deployed();
    console.log('AccessRegistry deployed to:', access.address);
  }

  // BatchToken deploy with robust detection and 3-address support
  const BatchToken = await ethers.getContractFactory('BatchToken');
  const deployName = 'BotanicalBatch';
  const deploySymbol = 'BBT';

  const ctorInputs = getConstructorInputs(BatchToken);
  console.log('Detected BatchToken constructor inputs:', ctorInputs.map(i => (i.type || i)).join(', ') || '(none)');

  let batch;
  // New handling: if three addresses are expected, pass (access, deployer, admin)
  if (ctorInputs.length === 3 && ctorInputs[0].type === 'address' && ctorInputs[1].type === 'address' && ctorInputs[2].type === 'address') {
    console.log('Detected BatchToken(address,address,address) constructor — calling BatchToken.deploy(access.address, deployer.address, adminAddr)');
    batch = await BatchToken.deploy(access.address, deployer.address, adminAddr);
  } else if (ctorInputs.length === 3 && (ctorInputs[0].type || ctorInputs[0]) === 'string') {
    console.log('Calling BatchToken.deploy(name, symbol, access.address)');
    batch = await BatchToken.deploy(deployName, deploySymbol, access.address);
  } else if (ctorInputs.length === 3 && (ctorInputs[0].type || ctorInputs[0]) === 'address') {
    console.log('Calling BatchToken.deploy(access.address, name, symbol)');
    batch = await BatchToken.deploy(access.address, deployName, deploySymbol);
  } else if (ctorInputs.length === 2 && (ctorInputs[0].type || ctorInputs[0]) === 'string') {
    console.log('Calling BatchToken.deploy(name, symbol)');
    batch = await BatchToken.deploy(deployName, deploySymbol);
  } else if (ctorInputs.length === 0) {
    console.log('Calling BatchToken.deploy() with no constructor args');
    batch = await BatchToken.deploy();
  } else {
    console.log('Fallback: Attempting BatchToken.deploy(access.address, name, symbol)');
    batch = await BatchToken.deploy(access.address, deployName, deploySymbol);
  }

  await batch.deployed();
  console.log('BatchToken deployed to:', batch.address);

  // AttestationVerifier (optional)
  let verifier = null;
  try {
    const Av = await ethers.getContractFactory('AttestationVerifier');
    console.log('Deploying AttestationVerifier...');
    const avCtorInputs = getConstructorInputs(Av);
    if (avCtorInputs.length >= 1 && (avCtorInputs[0].type || avCtorInputs[0]) === 'address') {
      verifier = await Av.deploy(access.address);
    } else {
      verifier = await Av.deploy();
    }
    await verifier.deployed();
    console.log('AttestationVerifier deployed to:', verifier.address);
  } catch (e) {
    console.log('AttestationVerifier not deployed (maybe absent). Error:', e.message || e);
  }

  // AggregationManager
  let aggregator = null;
  try {
    const AggregationManager = await ethers.getContractFactory('AggregationManager');
    console.log('Deploying AggregationManager...');
    const aggCtorInputs = getConstructorInputs(AggregationManager).map(i => i.type || i);
    if (aggCtorInputs.length >= 2 && aggCtorInputs[0] === 'address' && aggCtorInputs[1] === 'address') {
      console.log('Calling AggregationManager.deploy(batch.address, access.address)');
      aggregator = await AggregationManager.deploy(batch.address, access.address);
    } else {
      aggregator = await AggregationManager.deploy(batch.address, access.address);
    }
    await aggregator.deployed();
    console.log('AggregationManager deployed to:', aggregator.address);
  } catch (e) {
    console.log('AggregationManager not deployed (maybe absent). Error:', e.message || e);
  }

  // Grant roles via AccessRegistry if functions exist
  try {
    const ADMIN_ROLE = await access.ADMIN_ROLE();
    const AGGREGATOR_ROLE = await access.AGGREGATOR_ROLE();
    const RELAYER_ROLE = await access.RELAYER_ROLE();

    if (!(await access.hasRole(ADMIN_ROLE, adminAddr))) {
      const tx = await access.grantRole(ADMIN_ROLE, adminAddr);
      console.log('grant ADMIN_ROLE tx:', tx.hash);
      await tx.wait();
    } else {
      console.log('Admin already has ADMIN_ROLE');
    }

    if (aggregator && !(await access.hasRole(AGGREGATOR_ROLE, aggregator.address))) {
      const tx2 = await access.grantRole(AGGREGATOR_ROLE, aggregator.address);
      console.log('grant AGGREGATOR_ROLE tx:', tx2.hash);
      await tx2.wait();
    }

    if (!(await access.hasRole(RELAYER_ROLE, deployer.address))) {
      const tx3 = await access.grantRole(RELAYER_ROLE, deployer.address);
      console.log('grant RELAYER_ROLE tx:', tx3.hash);
      await tx3.wait();
    }
  } catch (e) {
    console.log('Role grant/AccessRegistry interactions failed (maybe different API). Error:', e.message || e);
  }

  // Write deployments JSON
  const out = {
    network: hre.network.name,
    timestamp: Date.now(),
    deployer: deployer.address,
    admin: adminAddr,
    AccessRegistry: access ? access.address : null,
    BatchToken: batch ? batch.address : null,
    AttestationVerifier: verifier ? verifier.address : null,
    AggregationManager: aggregator ? aggregator.address : null
  };
  fs.mkdirSync('deployments', { recursive: true });
  const outPath = path.join('deployments', `${hre.network.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Saved deployments file to', outPath);

  console.log('Deployment complete.');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Deployment failed:', err);
    process.exit(1);
  });
