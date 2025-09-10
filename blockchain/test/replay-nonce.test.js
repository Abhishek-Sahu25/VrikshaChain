const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Nonce replay protection (farmer)", function () {
  it("should prevent reuse of nonce", async function () {
    const [deployer, farmer, relayer] = await ethers.getSigners();

    const AccessRegistry = await ethers.getContractFactory("AccessRegistry");
    const access = await AccessRegistry.deploy(deployer.address);
    await access.deployed();

    const AttestationVerifier = await ethers.getContractFactory("AttestationVerifier");
    const verifier = await AttestationVerifier.deploy(deployer.address);
    await verifier.deployed();

    const BatchToken = await ethers.getContractFactory("BatchToken");
    const batch = await BatchToken.deploy(deployer.address, access.address, verifier.address);
    await batch.deployed();

    // grant farmer role
    const FARMER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FARMER_ROLE"));
    await access.connect(deployer).grant(FARMER_ROLE, farmer.address);

    const cid = "ipfs://replayTest";
    const species = "Test";
    const weight = 10;
    const collectedAt = Math.floor(Date.now() / 1000);
    const nonce = 42;

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

    const locationHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("0,0"));

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

    // attempt reuse: should revert in verifier with "nonce used"
    await expect(
      batch.connect(relayer).mintWithAttestation(
        relayer.address,
        cid,
        species,
        weight,
        collectedAt,
        locationHash,
        farmer.address,
        nonce,
        signature
      )
    ).to.be.revertedWith("nonce used");
  });
});
