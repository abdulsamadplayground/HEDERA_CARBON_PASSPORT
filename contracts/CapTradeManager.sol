// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CapTradeManager {
    struct AllocationRecord {
        address companyAccount;
        uint256 compliancePeriod;
        uint256 allocatedAmount;
        uint256 usedAmount;
        bool compliant;
    }

    mapping(address => mapping(uint256 => AllocationRecord)) public allocations;

    event AllocationCreated(address indexed company, uint256 period, uint256 amount);
    event EmissionsReported(address indexed company, uint256 period, uint256 used);
    event ComplianceStatusChanged(address indexed company, uint256 period, bool compliant);

    function recordAllocation(
        address companyAccount,
        uint256 compliancePeriod,
        uint256 amount
    ) external {
        require(companyAccount != address(0), "Invalid company account");
        require(amount > 0, "Amount must be positive");
        require(
            allocations[companyAccount][compliancePeriod].allocatedAmount == 0,
            "Allocation already exists for this period"
        );

        allocations[companyAccount][compliancePeriod] = AllocationRecord({
            companyAccount: companyAccount,
            compliancePeriod: compliancePeriod,
            allocatedAmount: amount,
            usedAmount: 0,
            compliant: true
        });

        emit AllocationCreated(companyAccount, compliancePeriod, amount);
    }

    function reportEmissions(
        address companyAccount,
        uint256 compliancePeriod,
        uint256 usedAmount
    ) external {
        AllocationRecord storage record = allocations[companyAccount][compliancePeriod];
        require(record.allocatedAmount > 0, "No allocation found for this period");

        record.usedAmount = usedAmount;
        bool newCompliant = usedAmount <= record.allocatedAmount;

        if (record.compliant != newCompliant) {
            record.compliant = newCompliant;
            emit ComplianceStatusChanged(companyAccount, compliancePeriod, newCompliant);
        }

        emit EmissionsReported(companyAccount, compliancePeriod, usedAmount);
    }

    function getAllocation(
        address companyAccount,
        uint256 compliancePeriod
    ) external view returns (AllocationRecord memory) {
        return allocations[companyAccount][compliancePeriod];
    }

    function getSurplusOrDeficit(
        address companyAccount,
        uint256 compliancePeriod
    ) external view returns (int256) {
        AllocationRecord storage record = allocations[companyAccount][compliancePeriod];
        return int256(record.allocatedAmount) - int256(record.usedAmount);
    }
}
