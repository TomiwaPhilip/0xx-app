// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface ILiquidityManager {
    function createPool(address token, uint24 fee) external returns (address pool);
    function registerContentToken(address tokenAddr, address creatorAddr) external;
    function setContentFactoryAddress(address _contentFactoryAddress) external;

    // Required for ContentFactory to grant POOL_CREATOR_ROLE 
    // (though roles are often bytes32, if the variable is public, direct access is fine, 
    // but an interface function is cleaner if variable is not public or for consistency)
    function POOL_CREATOR_ROLE() external view returns (bytes32);

    // WETH9 address is public immutable in LiquidityManager, so it can be read directly.
    function WETH9() external view returns (address);
} 