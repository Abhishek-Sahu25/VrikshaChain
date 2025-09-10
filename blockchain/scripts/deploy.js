require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const AccessRegistry = await hre.ethers.getContractFactory("AccessRegistry");
  const access = await AccessRegistry.deploy(deployer.address);
  await access.deployed();
  console.log("AccessRegistry:", access.address);

  const AttestationVerifier = await hre.ethers.getContractFactory("AttestationVerifier");
  const verifier = await AttestationVerifier.deploy(deployer.address);
  await verifier.deployed();
  console.log("AttestationVerifier:", verifier.address);

  const BatchToken = await hre.ethers.getContractFactory("BatchToken");
  const batch = await BatchToken.deploy(deployer.address, access.address, verifier.address);
  await batch.deployed();
  console.log("BatchToken:", batch.address);

  const AggregationManager = await hre.ethers.getContractFactory("AggregationManager");
  const agg = await AggregationManager.deploy(deployer.address, batch.address);
  await agg.deployed();
  console.log("AggregationManager:", agg.address);

  // Grant AggregationManager ADMIN_ROLE on BatchToken so it can mint parents & setParent
  const ADMIN_ROLE = await batch.DEFAULT_ADMIN_ROLE();
  await batch.connect(deployer).grantRole(ADMIN_ROLE, agg.address);
  console.log("Granted ADMIN_ROLE on BatchToken to AggregationManager");

  // Grant aggregator role on AggregationManager to deployer (or later to EOA/multisig)
  const AGG_ROLE = await agg.AGGREGATOR_ROLE();
  await agg.connect(deployer).grantRole(AGG_ROLE, deployer.address);
  console.log("Granted AGGREGATOR_ROLE on AggregationManager to deployer");

  console.log("Deployment complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
