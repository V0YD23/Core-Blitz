// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CoreBlitzNFTRental is ReentrancyGuard, Ownable(msg.sender) {
    struct RentalListing {
        address owner;
        address renter;
        uint256 pricePerHour;
        uint256 rentalExpiry;
        bool isListed;
    }
    
    IERC721 public immutable nftContract;
    mapping(uint256 => RentalListing) public rentalListings;
    
    // Array to keep track of all listed token IDs
    uint256[] private listedTokenIds;
    mapping(uint256 => uint256) private tokenIdToIndex;
    
    event NFTListedForRent(uint256 indexed tokenId, address indexed owner, uint256 pricePerHour);
    event NFTUnlisted(uint256 indexed tokenId, address indexed owner);
    event NFTRented(uint256 indexed tokenId, address indexed renter, uint256 expiryTime);
    
    constructor(address _nftContract) {
        require(_nftContract != address(0), "Invalid contract address");
        nftContract = IERC721(_nftContract);
    }
    
    function listNFTForRent(uint256 tokenId, uint256 pricePerHour) external {
        require(nftContract.ownerOf(tokenId) == msg.sender, "You are not the owner");
        require(pricePerHour > 0, "Price must be greater than zero");
        require(nftContract.getApproved(tokenId) == address(this) || nftContract.isApprovedForAll(msg.sender, address(this)),
             "Contract is not approved to transfer NFT");
        
        if (!rentalListings[tokenId].isListed) {
            // Add to the array of listed tokens if not already listed
            tokenIdToIndex[tokenId] = listedTokenIds.length;
            listedTokenIds.push(tokenId);
        }
        
        rentalListings[tokenId] = RentalListing({
            owner: msg.sender,
            renter: address(0),
            pricePerHour: pricePerHour,
            rentalExpiry: 0,
            isListed: true
        });
        
        emit NFTListedForRent(tokenId, msg.sender, pricePerHour);
    }
    
    function unlistNFT(uint256 tokenId) external {
        require(rentalListings[tokenId].owner == msg.sender, "You are not the owner");
        require(rentalListings[tokenId].isListed, "NFT is not listed");
        
        rentalListings[tokenId].isListed = false;
        
        // Remove from the listed tokens array
        uint256 index = tokenIdToIndex[tokenId];
        uint256 lastTokenId = listedTokenIds[listedTokenIds.length - 1];
        
        listedTokenIds[index] = lastTokenId;
        tokenIdToIndex[lastTokenId] = index;
        
        listedTokenIds.pop();
        delete tokenIdToIndex[tokenId];
        
        emit NFTUnlisted(tokenId, msg.sender);
    }
    
    function rentNFT(uint256 tokenId, uint256 hoursRequested) external payable nonReentrant {
        RentalListing storage listing = rentalListings[tokenId];
        
        require(listing.isListed, "NFT is not listed for rent");
        require(hoursRequested > 0, "Must rent for at least 1 hour");
        require(listing.renter == address(0) || block.timestamp > listing.rentalExpiry, "NFT is currently rented");
        
        uint256 totalCost = listing.pricePerHour * hoursRequested;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Transfer payment to the owner
        (bool success, ) = payable(listing.owner).call{value: totalCost}("");
        require(success, "Payment transfer failed");
        
        // Transfer NFT to renter
        nftContract.safeTransferFrom(listing.owner, msg.sender, tokenId);
        
        // Set rental details
        listing.renter = msg.sender;
        listing.rentalExpiry = block.timestamp + (hoursRequested * 1 hours);
        
        emit NFTRented(tokenId, msg.sender, listing.rentalExpiry);
    }
    
    function reclaimNFT(uint256 tokenId) external {
        RentalListing storage listing = rentalListings[tokenId];
        
        require(block.timestamp > listing.rentalExpiry, "Rental period not over yet");
        require(listing.owner == msg.sender, "Only the owner can reclaim");
        
        // Transfer NFT back to the owner
        nftContract.safeTransferFrom(listing.renter, msg.sender, tokenId);
        
        // Reset rental details
        listing.renter = address(0);
        listing.rentalExpiry = 0;
        listing.isListed = false;
        
        // Remove from the listed tokens array
        uint256 index = tokenIdToIndex[tokenId];
        uint256 lastTokenId = listedTokenIds[listedTokenIds.length - 1];
        
        listedTokenIds[index] = lastTokenId;
        tokenIdToIndex[lastTokenId] = index;
        
        listedTokenIds.pop();
        delete tokenIdToIndex[tokenId];
        
        emit NFTUnlisted(tokenId, msg.sender);
    }
    
    // Get all available NFTs that are not currently rented
    function getAvailableNFTs() external view returns (uint256[] memory tokenIds, address[] memory owners, uint256[] memory prices) {
        uint256 count = 0;
        
        // First count how many are available
        for (uint i = 0; i < listedTokenIds.length; i++) {
            uint256 tokenId = listedTokenIds[i];
            RentalListing storage listing = rentalListings[tokenId];
            if (listing.isListed && (listing.renter == address(0) || block.timestamp > listing.rentalExpiry)) {
                count++;
            }
        }
        
        // Initialize arrays with the correct size
        tokenIds = new uint256[](count);
        owners = new address[](count);
        prices = new uint256[](count);
        
        // Fill the arrays
        uint256 index = 0;
        for (uint i = 0; i < listedTokenIds.length; i++) {
            uint256 tokenId = listedTokenIds[i];
            RentalListing storage listing = rentalListings[tokenId];
            if (listing.isListed && (listing.renter == address(0) || block.timestamp > listing.rentalExpiry)) {
                tokenIds[index] = tokenId;
                owners[index] = listing.owner;
                prices[index] = listing.pricePerHour;
                index++;
            }
        }
        
        return (tokenIds, owners, prices);
    }
}