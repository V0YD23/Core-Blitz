// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract Tetris_Staking {

    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public targetScore;
    mapping(address => bool) public wonLatestGame;

    // 🔹 New Events
    event Staked(address indexed user, uint256 amount);
    event EmergencyWithdrawal(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 indexed amount);
    event LostGame(address indexed user, uint256 indexed amount);


    function stake(uint256 expectedScore) external payable {
        require(msg.value > 0, "You must stake a non-zero amount of ETH");
        stakedAmount[msg.sender] += msg.value;
        targetScore[msg.sender] = expectedScore;
        wonLatestGame[msg.sender]=false;
        emit Staked(msg.sender, msg.value);
    }

    function withdraw(
        uint256 score
    ) external {
        uint256 balance = stakedAmount[msg.sender];
        require(balance > 0, "No staked balance to withdraw");
        require(
            address(this).balance >= balance,
            "Contract has insufficient balance"
        );


        if (score < targetScore[msg.sender]) {
            emit LostGame(msg.sender, balance);
            stakedAmount[msg.sender] = 0;
            return;
        }

        // ✅ If verification succeeds, transfer ETH and emit event
        stakedAmount[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "ETH transfer failed");
        wonLatestGame[msg.sender]=true;
        emit Withdrawn(msg.sender, balance);
    }

    /// 🔹 **Emergency function to withdraw all funds without ZKP**
    function emergencyWithdraw() external {
        uint256 balance = address(this).balance;
        require(balance > 0, "No staked balance to withdraw");
        require(
            address(this).balance >= balance,
            "Contract has insufficient balance"
        );

        stakedAmount[msg.sender] = 0; // Reset balance

        payable(msg.sender).transfer(balance);
        emit EmergencyWithdrawal(msg.sender, balance);
    }

    function getStakedBalance(address user) external view returns (uint256) {
        return stakedAmount[user];
    }

    function getTargetSet(address user) external view returns (uint256) {
        return targetScore[user];
    }


    function getLatestGame(address user) external view returns (bool) {
        return wonLatestGame[user];
    }


    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
