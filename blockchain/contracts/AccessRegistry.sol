// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AccessRegistry is AccessControl {
    // high-level roles
    bytes32 public constant ADMIN_ROLE        = DEFAULT_ADMIN_ROLE;
    bytes32 public constant AGGREGATOR_ROLE   = keccak256("AGGREGATOR_ROLE");
    bytes32 public constant QA_ROLE           = keccak256("QA_ROLE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant RELAYER_ROLE      = keccak256("RELAYER_ROLE");

    // the system uses only FARMER_ROLE as the on-chain originator role (no separate COLLECTOR_ROLE)
    bytes32 public constant FARMER_ROLE       = keccak256("FARMER_ROLE");
    bytes32 public constant LAB_ROLE          = keccak256("LAB_ROLE");
    bytes32 public constant CONSUMER_ROLE     = keccak256("CONSUMER_ROLE");

    event RoleGrantedByAdmin(bytes32 role, address account);
    event RoleRevokedByAdmin(bytes32 role, address account);

    constructor(address admin) {
        require(admin != address(0), "admin zero");
        _setupRole(ADMIN_ROLE, admin);
    }

    /// @notice Admin-only grant wrapper
    function grant(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        grantRole(role, account);
        emit RoleGrantedByAdmin(role, account);
    }

    /// @notice Admin-only revoke wrapper
    function revokeRoleFrom(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        revokeRole(role, account);
        emit RoleRevokedByAdmin(role, account);
    }

    /// @notice Generic role check helper
    function hasRoleFor(bytes32 role, address account) external view returns (bool) {
        return hasRole(role, account);
    }

    /// @notice Convenience: decide who is a valid on-chain originator (farmer only)
    function isFarmer(address account) external view returns (bool) {
        return hasRole(FARMER_ROLE, account);
    }
}
