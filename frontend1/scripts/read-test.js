// frontend1/scripts/read-test.js
// Run with node (Node 18+). If your project uses ESM, run the same way you ran before.

import fs from 'fs';
import { ethers } from 'ethers';
import path from 'path';

// === CONFIG ===
// Replace with your rotated (safe) Alchemy key or put it in environment variable ALCHEMY_KEY
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || "VBfQI8ahNSG-brq1FVU5b";
const ALCHEMY_URL = `https://eth-sepolia.g.alchemy.com/v2/VBfQI8ahNSG-brq1FVU5b`;

// Contract info (AccessRegistry)
const ABI_PATH = path.join('src', 'abis', 'AccessRegistry.json');
const CONTRACT_ADDRESS = "0xd57023CbfaaCAa47e235A40D7A57A2A70Acc7CDa"; // from your addresses.json

async function main() {
  if (ALCHEMY_KEY === "VBfQI8ahNSG-brq1FVU5b" || !ALCHEMY_KEY) {
    console.error("ERROR: Please set your ALCHEMY_KEY in the script or run with env var ALCHEMY_KEY.");
    process.exit(1);
  }

  // load ABI
  const raw = fs.readFileSync(ABI_PATH, 'utf8');
  const artifact = JSON.parse(raw);
  const abi = artifact.abi ?? artifact;

  // provider
  const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);

  // contract
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

  // 1) call ADMIN_ROLE() constant
  try {
    const adminRole = await contract.ADMIN_ROLE();
    console.log("ADMIN_ROLE:", adminRole);
  } catch (e) {
    console.error("Error calling ADMIN_ROLE():", e);
  }

  // 2) call isFarmer(someAddress) - put a real address to test
  // You can test with an address like your MetaMask account or the deployer address
  const testAddress = process.env.TEST_ADDRESS || "0x0000000000000000000000000000000000000000";
  try {
    const isFarmer = await contract.isFarmer(testAddress);
    console.log(`isFarmer(${testAddress}):`, isFarmer);
  } catch (e) {
    console.error(`Error calling isFarmer(${testAddress}):`, e);
  }

  // 3) list a few read-only functions available (helpful)
  try {
    const viewFunctions = abi
      .filter((x) => x.type === 'function' && (x.stateMutability === 'view' || x.stateMutability === 'pure'))
      .map((f) => ({ name: f.name, inputs: f.inputs?.map(i => `${i.type} ${i.name}`).join(', ') || '' }));
    console.log("Available view functions (sample):", viewFunctions.slice(0, 20));
  } catch (e) {
    // ignore
  }
}

main().catch((err) => {
  console.error("Fatal error in script:", err);
  process.exit(1);
});
