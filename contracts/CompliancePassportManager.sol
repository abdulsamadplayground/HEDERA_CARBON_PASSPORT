// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CompliancePassportManager {
    enum PassportType { COMPANY, BATCH, ITEM }

    struct PassportRecord {
        address companyAccount;
        PassportType passportType;
        uint256 emissionTier;       // 1, 2, or 3
        uint256 baselineEmissions;  // tCO2e
        bytes32 metadataHash;       // Hash of full metadata on HFS
        string companyDid;
        string carbonScore;         // "A", "B", "C", "D", "F"
        uint256 parentBatchSerial;  // 0 for company/batch passports
        uint256 createdAt;
        uint256[] stampSerials;
        uint256[] claimSerials;
    }

    // passportSerial => PassportRecord
    mapping(uint256 => PassportRecord) public passports;
    // batchSerial => itemSerials
    mapping(uint256 => uint256[]) public batchItems;

    event PassportRegistered(uint256 indexed serial, address company, PassportType pType, uint256 tier);
    event StampAssociated(uint256 indexed passportSerial, uint256 stampSerial);
    event ClaimAssociated(uint256 indexed passportSerial, uint256 claimSerial);
    event PassportUpdated(uint256 indexed serial, uint256 newTier, bytes32 newMetadataHash);
    event BatchItemLinked(uint256 indexed batchSerial, uint256 itemSerial);

    function registerPassport(
        uint256 serial,
        address companyAccount,
        PassportType passportType,
        uint256 emissionTier,
        uint256 baselineEmissions,
        bytes32 metadataHash,
        string calldata companyDid,
        string calldata carbonScore,
        uint256 parentBatchSerial
    ) external {
        require(passports[serial].companyAccount == address(0), "Passport already registered");
        require(companyAccount != address(0), "Invalid company account");
        require(emissionTier >= 1 && emissionTier <= 3, "Invalid emission tier");
        require(bytes(companyDid).length > 0, "Company DID cannot be empty");

        PassportRecord storage record = passports[serial];
        record.companyAccount = companyAccount;
        record.passportType = passportType;
        record.emissionTier = emissionTier;
        record.baselineEmissions = baselineEmissions;
        record.metadataHash = metadataHash;
        record.companyDid = companyDid;
        record.carbonScore = carbonScore;
        record.parentBatchSerial = parentBatchSerial;
        record.createdAt = block.timestamp;

        // If this is an ITEM passport, link it to its parent batch
        if (passportType == PassportType.ITEM && parentBatchSerial > 0) {
            require(
                passports[parentBatchSerial].passportType == PassportType.BATCH,
                "Parent must be a batch passport"
            );
            batchItems[parentBatchSerial].push(serial);
            emit BatchItemLinked(parentBatchSerial, serial);
        }

        emit PassportRegistered(serial, companyAccount, passportType, emissionTier);
    }

    function associateStamp(uint256 passportSerial, uint256 stampSerial) external {
        require(passports[passportSerial].companyAccount != address(0), "Passport does not exist");

        passports[passportSerial].stampSerials.push(stampSerial);

        emit StampAssociated(passportSerial, stampSerial);
    }

    function associateClaim(uint256 passportSerial, uint256 claimSerial) external {
        require(passports[passportSerial].companyAccount != address(0), "Passport does not exist");

        passports[passportSerial].claimSerials.push(claimSerial);

        emit ClaimAssociated(passportSerial, claimSerial);
    }

    function updatePassport(
        uint256 serial,
        uint256 newTier,
        bytes32 newMetadataHash,
        string calldata newScore
    ) external {
        PassportRecord storage record = passports[serial];
        require(record.companyAccount != address(0), "Passport does not exist");
        require(newTier >= 1 && newTier <= 3, "Invalid emission tier");

        record.emissionTier = newTier;
        record.metadataHash = newMetadataHash;
        record.carbonScore = newScore;

        emit PassportUpdated(serial, newTier, newMetadataHash);
    }

    function getPassport(uint256 serial) external view returns (PassportRecord memory) {
        return passports[serial];
    }

    function getStamps(uint256 passportSerial) external view returns (uint256[] memory) {
        return passports[passportSerial].stampSerials;
    }

    function getClaims(uint256 passportSerial) external view returns (uint256[] memory) {
        return passports[passportSerial].claimSerials;
    }

    function getBatchItems(uint256 batchSerial) external view returns (uint256[] memory) {
        return batchItems[batchSerial];
    }
}
