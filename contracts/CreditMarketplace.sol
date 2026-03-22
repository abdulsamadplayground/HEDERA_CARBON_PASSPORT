// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CreditMarketplace {
    enum MarketType { COMPLIANCE, VOLUNTARY }
    enum ListingStatus { ACTIVE, SOLD, EXPIRED, CANCELLED }

    struct Listing {
        address seller;
        uint256 quantity;        // CCR amount (2 decimals)
        uint256 pricePerUnit;    // HBAR tinybars per CCR
        MarketType marketType;
        ListingStatus status;
        uint256 expiresAt;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    event ListingCreated(uint256 indexed id, address seller, uint256 quantity, uint256 price);
    event ListingPurchased(uint256 indexed id, address buyer, uint256 quantity);
    event ListingExpired(uint256 indexed id);

    function createListing(
        uint256 quantity,
        uint256 pricePerUnit,
        MarketType marketType,
        uint256 expiresAt
    ) external returns (uint256 listingId) {
        require(quantity > 0, "Quantity must be positive");
        require(pricePerUnit > 0, "Price must be positive");
        require(expiresAt > block.timestamp, "Expiry must be in the future");

        listingId = nextListingId;
        nextListingId++;

        listings[listingId] = Listing({
            seller: msg.sender,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            marketType: marketType,
            status: ListingStatus.ACTIVE,
            expiresAt: expiresAt
        });

        emit ListingCreated(listingId, msg.sender, quantity, pricePerUnit);
    }

    function purchaseListing(uint256 listingId) external payable {
        Listing storage listing = listings[listingId];
        require(listing.seller != address(0), "Listing does not exist");
        require(listing.status == ListingStatus.ACTIVE, "Listing is not active");
        require(block.timestamp < listing.expiresAt, "Listing has expired");
        require(msg.sender != listing.seller, "Seller cannot buy own listing");

        uint256 totalCost = listing.quantity * listing.pricePerUnit;
        require(msg.value >= totalCost, "Insufficient HBAR sent");

        listing.status = ListingStatus.SOLD;

        // Transfer HBAR to seller
        (bool sent, ) = payable(listing.seller).call{value: totalCost}("");
        require(sent, "HBAR transfer to seller failed");

        // Refund excess HBAR
        if (msg.value > totalCost) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(refunded, "HBAR refund failed");
        }

        emit ListingPurchased(listingId, msg.sender, listing.quantity);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Only seller can cancel");
        require(listing.status == ListingStatus.ACTIVE, "Listing is not active");

        listing.status = ListingStatus.CANCELLED;
    }

    function expireListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Listing is not active");
        require(block.timestamp >= listing.expiresAt, "Listing has not expired yet");

        listing.status = ListingStatus.EXPIRED;

        emit ListingExpired(listingId);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
}
