// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DIDRegistry {
    enum EntityType { COMPANY, REGULATOR, VERIFIER }

    struct DIDRecord {
        string did;
        string hfsFileId;
        EntityType entityType;
        address owner;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // keccak256(did) => record
    mapping(bytes32 => DIDRecord) public didRecords;
    mapping(address => string) public accountToDid;

    event DIDRegistered(string did, address indexed owner, EntityType entityType);
    event DIDUpdated(string did, string newHfsFileId);

    function registerDID(
        string calldata did,
        string calldata hfsFileId,
        EntityType entityType
    ) external {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        require(didRecords[didHash].owner == address(0), "DID already registered");
        require(bytes(did).length > 0, "DID cannot be empty");
        require(bytes(hfsFileId).length > 0, "HFS file ID cannot be empty");

        didRecords[didHash] = DIDRecord({
            did: did,
            hfsFileId: hfsFileId,
            entityType: entityType,
            owner: msg.sender,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        accountToDid[msg.sender] = did;

        emit DIDRegistered(did, msg.sender, entityType);
    }

    function updateDIDDocument(
        string calldata did,
        string calldata newHfsFileId
    ) external {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        DIDRecord storage record = didRecords[didHash];
        require(record.owner == msg.sender, "Only DID owner can update");
        require(bytes(newHfsFileId).length > 0, "HFS file ID cannot be empty");

        record.hfsFileId = newHfsFileId;
        record.updatedAt = block.timestamp;

        emit DIDUpdated(did, newHfsFileId);
    }

    function resolveDID(string calldata did) external view returns (DIDRecord memory) {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        DIDRecord memory record = didRecords[didHash];
        require(record.owner != address(0), "DID not found");
        return record;
    }

    function getDIDByAccount(address account) external view returns (string memory) {
        return accountToDid[account];
    }
}
