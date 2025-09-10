const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Role-based flows (admin, farmer, lab, manufacturer)", function () {
  let deployer, farmer, lab, manufacturer, relayer, other;
  let access, verifier, batch;

  beforeEach(async function () {
    [deployer, farmer, lab, manufacturer, relayer, other] = await ethers.getSigners();

    const AccessRegistry = await ethers.getContractFactory("AccessRegistry");
    access = await AccessRegistry.deploy(deployer.address);
    await access.deployed();

    const AttestationVerifier = await ethers.getContractFactory("AttestationVerifier");
    verifier = await AttestationVerifier.deploy(deployer.address);
    await verifier.deployed();

    const BatchToken = await ethers.getContractFactory("BatchToken");
    batch = await BatchToken.deploy(deployer.address, access.address, verifier.address);
    await batch.deployed();
  });

  it("only admin can grant farmer role", async function () {
    const FARMER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FARMER_ROLE"));
    await expect(access.connect(deployer).grant(FARMER_ROLE, farmer.address)).to.not.be.reverted;
    await expect(access.connect(other).grant(FARMER_ROLE, other.address)).to.be.reverted;
  });

  it("lab can update metadata after mint by farmer", async function () {
    const FARMER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FARMER_ROLE"));
    const LAB_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("LAB_ROLE"));
    await access.connect(deployer).grant(FARMER_ROLE, farmer.address);
    await access.connect(deployer).grant(LAB_ROLE, lab.address);

    const cid = "ipfs://labtest";
    const species = "Herb";
    const weight = 100;
    const collectedAt = Math.floor(Date.now() / 1000);
    const nonce = 5;
    const types = {
      BatchAttestation: [
        { name: "cid", type: "string" },
        { name: "species", type: "string" },
        { name: "weight", type: "uint256" },
        { name: "collectedAt", type: "uint256" },
        { name: "farmer", type: "address" },
        { name: "nonce", type: "uint256" }
      ]
    };

    const signature = await farmer._signTypedData(
      { name: "PlantBatchAttestation", version: "1", chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: verifier.address },
      types,
      { cid, species, weight, collectedAt, farmer: farmer.address, nonce }
    );

    const locationHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1,1"));

    await batch.connect(relayer).mintWithAttestation(
      relayer.address,
      cid,
      species,
      weight,
      collectedAt,
      locationHash,
      farmer.address,
      nonce,
      signature
    );

    const newCid = "ipfs://lab-updated";
    await expect(batch.connect(lab).updateMetadataCID(1, newCid)).to.emit(batch, "MetadataUpdated");
    const updated = await batch.batches(1);
    expect(updated.metadataCID).to.equal(newCid);
  });

  it("manufacturer can change state after mint", async function () {
    const FARMER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FARMER_ROLE"));
    const MANUFACTURER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MANUFACTURER_ROLE"));
    // NOTE: do NOT grant manufacturer role yet — test unauthorized attempt first
    await access.connect(deployer).grant(FARMER_ROLE, farmer.address);

    const cid = "ipfs://mftest";
    const species = "Herb";
    const weight = 100;
    const collectedAt = Math.floor(Date.now() / 1000);
    const nonce = 6;
    const types = {
      BatchAttestation: [
        { name: "cid", type: "string" },
        { name: "species", type: "string" },
        { name: "weight", type: "uint256" },
        { name: "collectedAt", type: "uint256" },
        { name: "farmer", type: "address" },
        { name: "nonce", type: "uint256" }
      ]
    };

    const signature = await farmer._signTypedData(
      { name: "PlantBatchAttestation", version: "1", chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: verifier.address },
      types,
      { cid, species, weight, collectedAt, farmer: farmer.address, nonce }
    );

    const locationHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("2,2"));

    await batch.connect(relayer).mintWithAttestation(
      relayer.address,
      cid,
      species,
      weight,
      collectedAt,
      locationHash,
      farmer.address,
      nonce,
      signature
    );

    // unauthorized manufacturer attempt should revert
    await expect(batch.connect(manufacturer).changeState(1, 3)).to.be.revertedWith("not authorized");

    // now grant manufacturer role and succeed
    await access.connect(deployer).grant(MANUFACTURER_ROLE, manufacturer.address);
    await expect(batch.connect(manufacturer).changeState(1, 3)).to.emit(batch, "BatchStateChanged");
    const b = await batch.batches(1);
    expect(b.state).to.equal(3);
  });
});
