// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClaimsManager {
    enum ClaimType { LOW_CARBON, CARBON_NEUTRAL, NET_ZERO, RENEWABLE_ENERGY, CIRCULAR_ECONOMY, FAIR_TRADE }
    enum ClaimStatus { PENDING, ATTESTED, REJECTED, EXPIRED }

    struct ClaimRecord {
        address companyAccount;
        ClaimType claimType;
        ClaimStatus status;
        bytes32 credentialHash;
        string companyDid;
        string verifierDid;
        uint256 vclaimSerial;
        uint256 passportSerial;
        uint256 attestedAt;
        uint256 expiresAt;
    }

    mapping(uint256 => ClaimRecord) public claims;
    uint256 public nextClaimId;

    // company => claimIds
    mapping(address => uint256[]) private companyClaimIds;

    event ClaimSubmitted(uint256 indexed claimId, address company, ClaimType claimType);
    event ClaimAttested(uint256 indexed claimId, string verifierDid, uint256 vclaimSerial);

    function submitClaim(
        address companyAccount,
        ClaimType claimType,
        string calldata companyDid,
        uint256 passportSerial
    ) external returns (uint256 claimId) {
        require(companyAccount != address(0), "Invalid company account");
        require(bytes(companyDid).length > 0, "Company DID cannot be empty");

        claimId = nextClaimId;
        nextClaimId++;

        claims[claimId] = ClaimRecord({
            companyAccount: companyAccount,
            claimType: claimType,
            status: ClaimStatus.PENDING,
            credentialHash: bytes32(0),
            companyDid: companyDid,
            verifierDid: "",
            vclaimSerial: 0,
            passportSerial: passportSerial,
            attestedAt: 0,
            expiresAt: 0
        });

        companyClaimIds[companyAccount].push(claimId);

        emit ClaimSubmitted(claimId, companyAccount, claimType);
    }

    function attestClaim(
        uint256 claimId,
        string calldata verifierDid,
        bytes32 credentialHash,
        uint256 vclaimSerial,
        uint256 expiresAt
    ) external {
        ClaimRecord storage claim = claims[claimId];
        require(claim.companyAccount != address(0), "Claim does not exist");
        require(claim.status == ClaimStatus.PENDING, "Claim is not pending");
        require(bytes(verifierDid).length > 0, "Verifier DID cannot be empty");
        require(credentialHash != bytes32(0), "Credential hash cannot be empty");
        require(expiresAt > block.timestamp, "Expiry must be in the future");

        claim.status = ClaimStatus.ATTESTED;
        claim.verifierDid = verifierDid;
        claim.credentialHash = credentialHash;
        claim.vclaimSerial = vclaimSerial;
        claim.attestedAt = block.timestamp;
        claim.expiresAt = expiresAt;

        emit ClaimAttested(claimId, verifierDid, vclaimSerial);
    }

    function getClaim(uint256 claimId) external view returns (ClaimRecord memory) {
        return claims[claimId];
    }

    function getClaimsByCompany(address companyAccount) external view returns (uint256[] memory) {
        return companyClaimIds[companyAccount];
    }
}
