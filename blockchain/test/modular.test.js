const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Modular Suite (farmer flows)", function () {
  let deployer, farmer, aggregator, relayer, other;
  let AccessRegistry, access, AttestationVerifier, verifier, BatchToken, batch, AggregationManager, agg;

  beforeEach(async function () {
    [deployer, farmer, aggregator, relayer, other] = await ethers.getSigners();

    AccessRegistry = await ethers.getContractFactory("AccessRegistry");
    access = await AccessRegistry.deploy(deployer.address);
    await access.deployed();

    AttestationVerifier = await ethers.getContractFactory("AttestationVerifier");
    verifier = await AttestationVerifier.deploy(deployer.address);
    await verifier.deployed();

    BatchToken = await ethers.getContractFactory("BatchToken");
    batch = await BatchToken.deploy(deployer.address, access.address, verifier.address);
    await batch.deployed();

    AggregationManager = await ethers.getContractFactory("AggregationManager");
    agg = await AggregationManager.deploy(deployer.address, batch.address);
    await agg.deployed();

    // grant roles
    const FARMER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FARMER_ROLE"));
    await access.connect(deployer).grant(FARMER_ROLE, farmer.address);

    // grant agg admin role on BatchToken to AggregationManager
    const ADMIN_ROLE = await batch.DEFAULT_ADMIN_ROLE();
    await batch.connect(deployer).grantRole(ADMIN_ROLE, agg.address);

    // grant aggregator role on AggregationManager to aggregator signer
    const AGG_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AGGREGATOR_ROLE"));
    await agg.connect(deployer).grantRole(AGG_ROLE, aggregator.address);
  });

  it("farmer signs and relayer mints, then aggregator aggregates", async function () {
    const cid = "ipfs://bafyTestCid";
    const species = "Withania somnifera";
    const weight = 1000;
    const collectedAt = Math.floor(Date.now() / 1000);
    const nonce = 1;

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

    const locationHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("12.34,56.78"));
    await expect(
      batch.connect(relayer).mintWithAttestation(
        relayer.address, // to
        cid,
        species,
        weight,
        collectedAt,
        locationHash,
        farmer.address, // farmer param
        nonce,
        signature
      )
    ).to.emit(batch, "BatchMinted");

    // mint second child
    const nonce2 = 2;
    const cid2 = "ipfs://bafyTestCid2";
    const signature2 = await farmer._signTypedData(
      { name: "PlantBatchAttestation", version: "1", chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: verifier.address },
      types,
      { cid: cid2, species, weight, collectedAt, farmer: farmer.address, nonce: nonce2 }
    );
    await batch.connect(relayer).mintWithAttestation(
      relayer.address,
      cid2,
      species,
      weight,
      collectedAt,
      locationHash,
      farmer.address,
      nonce2,
      signature2
    );

    // aggregate children [1,2]
    const children = [1, 2];
    const parentCid = "ipfs://parentCid";
    await expect(
      agg.connect(aggregator).aggregate(relayer.address, parentCid, locationHash, children)
    ).to.emit(agg, "Aggregated");

    const parent = await batch.batches(3);
    expect(parent.metadataCID).to.equal(parentCid);
    const child1 = await batch.batches(1);
    expect(child1.parentId).to.equal(3);
  });
});
