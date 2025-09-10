require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const accessAddress = process.env.ACCESS_REGISTRY_ADDRESS;
  if (!accessAddress) throw new Error("Set ACCESS_REGISTRY_ADDRESS in .env");

  const AccessRegistry = await hre.ethers.getContractFactory("AccessRegistry");
  const access = AccessRegistry.attach(accessAddress);

  // seed example roles; replace with real addresses
  const collector = process.env.COLLECTOR_ADDRESS;
  const aggregator = process.env.AGGREGATOR_ADDRESS;

  const COLLECTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("COLLECTOR_ROLE"));
  const AGGREGATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AGGREGATOR_ROLE"));

  if (collector) {
    await access.connect(deployer).grant(COLLECTOR_ROLE, collector);
    console.log("Granted COLLECTOR_ROLE to", collector);
  }
  if (aggregator) {
    await access.connect(deployer).grant(AGGREGATOR_ROLE, aggregator);
    console.log("Granted AGGREGATOR_ROLE to", aggregator);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
