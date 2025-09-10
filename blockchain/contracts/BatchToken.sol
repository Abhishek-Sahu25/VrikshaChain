// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IAccessRegistry {
    function hasRole(bytes32 role, address account) external view returns (bool);
    // convenience helper (implemented in AccessRegistry)
    function isFarmer(address account) external view returns (bool);
}

interface IAttestationVerifier {
    function verify(
        string calldata cid,
        string calldata species,
        uint256 weight,
        uint256 collectedAt,
        address farmer,
        uint256 nonce,
        bytes calldata signature
    ) external returns (address);
}

contract BatchToken is ERC721, Pausable, ReentrancyGuard, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    // role constants mirrored locally for readability
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant LAB_ROLE = keccak256("LAB_ROLE");
    bytes32 public constant AGGREGATOR_ROLE = keccak256("AGGREGATOR_ROLE");
    bytes32 public constant QA_ROLE = keccak256("QA_ROLE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");

    struct Batch {
        uint256 id;
        string metadataCID;   // IPFS CID or similar
        bytes32 locationHash; // hashed coordinates / location pointer
        uint256 timestamp;    // collectedAt
        uint256 parentId;
        uint8 state;
    }

    mapping(uint256 => Batch) public batches;

    IAccessRegistry public accessRegistry;
    IAttestationVerifier public attestationVerifier;

    event BatchMinted(uint256 indexed tokenId, address indexed owner, string cid, bytes32 locationHash, uint256 timestamp, address farmer);
    event MetadataUpdated(uint256 indexed tokenId, string newCid);
    event BatchStateChanged(uint256 indexed tokenId, uint8 newState);
    event ParentAssigned(uint256 indexed childId, uint256 indexed parentId);

    constructor(address admin, address _accessRegistry, address _attestationVerifier) ERC721("PlantBatchToken", "PBT") {
        require(admin != address(0), "admin zero");
        _setupRole(ADMIN_ROLE, admin);
        accessRegistry = IAccessRegistry(_accessRegistry);
        attestationVerifier = IAttestationVerifier(_attestationVerifier);
    }

    /// @notice Mint a batch using an EIP-712 attestation signed by the farmer.
    function mintWithAttestation(
        address to,
        string calldata cid,
        string calldata species,
        uint256 weight,
        uint256 collectedAt,
        bytes32 locationHash,
        address farmer,
        uint256 nonce,
        bytes calldata signature
    ) external whenNotPaused nonReentrant returns (uint256) {
        // verify signature and mark nonce
        address signer = attestationVerifier.verify(cid, species, weight, collectedAt, farmer, nonce, signature);
        require(signer == farmer, "signature mismatch");

        // require that signer is a FARMER in AccessRegistry (we removed COLLECTOR_ROLE)
        require(accessRegistry.isFarmer(signer), "signer not farmer");

        _tokenIdCounter.increment();
        uint256 id = _tokenIdCounter.current();
        _safeMint(to, id);

        batches[id] = Batch({
            id: id,
            metadataCID: cid,
            locationHash: locationHash,
            timestamp: collectedAt,
            parentId: 0,
            state: 0
        });

        emit BatchMinted(id, to, cid, locationHash, collectedAt, signer);
        return id;
    }

    /// @notice Admin mints parent (aggregation)
    function adminMintParent(address to, string calldata cid, bytes32 locationHash) external onlyRole(ADMIN_ROLE) returns (uint256) {
        _tokenIdCounter.increment();
        uint256 id = _tokenIdCounter.current();
        _safeMint(to, id);

        batches[id] = Batch({
            id: id,
            metadataCID: cid,
            locationHash: locationHash,
            timestamp: block.timestamp,
            parentId: 0,
            state: 1
        });

        return id;
    }

    /// @notice Admin sets parent
    function setParent(uint256 childId, uint256 parentId) external onlyRole(ADMIN_ROLE) {
        require(_exists(childId) && _exists(parentId), "nonexistent");
        batches[childId].parentId = parentId;
        emit ParentAssigned(childId, parentId);
    }

    /// @notice Labs, Aggregators, QA, and Admin can update metadata
    function updateMetadataCID(uint256 tokenId, string calldata newCid) external whenNotPaused {
        require(_exists(tokenId), "nonexistent");
        require(
            accessRegistry.hasRole(AGGREGATOR_ROLE, msg.sender) ||
            accessRegistry.hasRole(QA_ROLE, msg.sender) ||
            accessRegistry.hasRole(LAB_ROLE, msg.sender) ||
            hasRole(ADMIN_ROLE, msg.sender),
            "not authorized"
        );
        batches[tokenId].metadataCID = newCid;
        emit MetadataUpdated(tokenId, newCid);
    }

    /// @notice QA, Aggregator, Manufacturer, Admin can change state
    function changeState(uint256 tokenId, uint8 newState) external whenNotPaused {
        require(_exists(tokenId), "nonexistent");
        require(
            accessRegistry.hasRole(QA_ROLE, msg.sender) ||
            accessRegistry.hasRole(AGGREGATOR_ROLE, msg.sender) ||
            accessRegistry.hasRole(MANUFACTURER_ROLE, msg.sender) ||
            hasRole(ADMIN_ROLE, msg.sender),
            "not authorized"
        );
        batches[tokenId].state = newState;
        emit BatchStateChanged(tokenId, newState);
    }

    // admin setters
    function setAccessRegistry(address addr) external onlyRole(ADMIN_ROLE) {
        accessRegistry = IAccessRegistry(addr);
    }
    function setAttestationVerifier(address addr) external onlyRole(ADMIN_ROLE) {
        attestationVerifier = IAttestationVerifier(addr);
    }
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
