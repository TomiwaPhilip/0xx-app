// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface IContentToken {
    function contentCreator() external view returns (address);
    function WETH_ADDRESS() external view returns (address);
    function liquidityManagerAddress() external view returns (address); // Added for completeness
    function depositReward(address rewardToken, uint256 amount) external payable;

    // From ERC20, useful for LiquidityManager
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    // function transferFrom(address sender, address recipient, uint256 amount) external returns (bool); // LM will be sender if it takes a cut
    function balanceOf(address account) external view returns (uint256);
    function symbol() external view returns (string memory); // For logging/debugging perhaps
} 