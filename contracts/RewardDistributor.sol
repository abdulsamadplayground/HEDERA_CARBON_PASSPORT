// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RewardDistributor {
    enum MilestoneType {
        FIRST_REPORT,           // 100 CCR
        TIER_IMPROVEMENT,       // 500 CCR
        SCORE_IMPROVEMENT,      // 250 CCR
        FIRST_STAMP,            // 200 CCR
        FIRST_CLAIM,            // 150 CCR
        REPORTING_STREAK        // 1000 CCR
    }

    struct MilestoneRecord {
        address companyAccount;
        MilestoneType milestoneType;
        uint256 rewardAmount;
        uint256 achievedAt;
    }

    // company => milestoneType => achieved
    mapping(address => mapping(uint8 => bool)) public achieved;
    MilestoneRecord[] public milestoneHistory;

    event MilestoneAchieved(address indexed company, uint8 milestoneType, uint256 reward);

    function recordMilestone(
        address companyAccount,
        MilestoneType milestoneType,
        uint256 rewardAmount
    ) external {
        require(companyAccount != address(0), "Invalid company account");
        uint8 milestoneIndex = uint8(milestoneType);
        require(!achieved[companyAccount][milestoneIndex], "Milestone already achieved");

        achieved[companyAccount][milestoneIndex] = true;

        milestoneHistory.push(MilestoneRecord({
            companyAccount: companyAccount,
            milestoneType: milestoneType,
            rewardAmount: rewardAmount,
            achievedAt: block.timestamp
        }));

        emit MilestoneAchieved(companyAccount, milestoneIndex, rewardAmount);
    }

    function isMilestoneAchieved(
        address companyAccount,
        MilestoneType milestoneType
    ) external view returns (bool) {
        return achieved[companyAccount][uint8(milestoneType)];
    }

    function getRewardAmount(MilestoneType milestoneType) external pure returns (uint256) {
        if (milestoneType == MilestoneType.FIRST_REPORT) return 100;
        if (milestoneType == MilestoneType.TIER_IMPROVEMENT) return 500;
        if (milestoneType == MilestoneType.SCORE_IMPROVEMENT) return 250;
        if (milestoneType == MilestoneType.FIRST_STAMP) return 200;
        if (milestoneType == MilestoneType.FIRST_CLAIM) return 150;
        if (milestoneType == MilestoneType.REPORTING_STREAK) return 1000;
        revert("Invalid milestone type");
    }
}
