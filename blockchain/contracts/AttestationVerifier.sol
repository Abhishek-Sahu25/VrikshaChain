// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract AttestationVerifier is EIP712, AccessControl {
    using ECDSA for bytes32;

    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    // Note: typed data field is `farmer` (not collector)
    bytes32 public constant BATCH_TYPEHASH = keccak256(
        "BatchAttestation(string cid,string species,uint256 weight,uint256 collectedAt,address farmer,uint256 nonce)"
    );

    // single-use nonces per farmer
    mapping(address => mapping(uint256 => bool)) public usedNonce;

    event NonceUsed(address indexed farmer, uint256 nonce);

    constructor(address admin) EIP712("PlantBatchAttestation", "1") {
        require(admin != address(0), "admin zero");
        _setupRole(ADMIN_ROLE, admin);
    }

    function _hashAttestation(
        string calldata cid,
        string calldata species,
        uint256 weight,
        uint256 collectedAt,
        address farmer,
        uint256 nonce
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            BATCH_TYPEHASH,
            keccak256(bytes(cid)),
            keccak256(bytes(species)),
            weight,
            collectedAt,
            farmer,
            nonce
        ));
    }

    /// @notice Verify signature (EIP-712) and mark nonce used. Returns signer address.
    function verify(
        string calldata cid,
        string calldata species,
        uint256 weight,
        uint256 collectedAt,
        address farmer,
        uint256 nonce,
        bytes calldata signature
    ) external returns (address) {
        require(!usedNonce[farmer][nonce], "nonce used");
        bytes32 structHash = _hashAttestation(cid, species, weight, collectedAt, farmer, nonce);
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        usedNonce[farmer][nonce] = true;
        emit NonceUsed(farmer, nonce);
        return signer;
    }

    /// @notice Admin-only reset (rare cases)
    function resetNonce(address farmer, uint256 nonce) external onlyRole(ADMIN_ROLE) {
        usedNonce[farmer][nonce] = false;
    }
}
