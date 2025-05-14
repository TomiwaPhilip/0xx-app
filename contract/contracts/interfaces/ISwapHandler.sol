// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

/**
 * @title ISwapHandler
 * @dev Interface for SwapHandler contract that handles token swaps with rewards
 */
interface ISwapHandler {
    
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
        uint256 deadline;
    }

    /**
     * @dev Executes a swap through Uniswap V3, handling ContentToken creator rewards.
     * @param params The parameters for the swap.
     * @return amountOutForUser The net amount of tokenOut received by the recipient after rewards.
     */
    function swap(SwapParams calldata params) external payable returns (uint256 amountOutForUser);

    /**
     * @dev Set the LiquidityManager contract address
     * @param _liquidityManager The address of the LiquidityManager contract
     */
    function setLiquidityManager(address _liquidityManager) external;

    /**
     * @dev Event emitted when swap is executed
     */
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountInSwapped,
        uint256 amountOutReceived
    );

    /**
     * @dev Event emitted when reward is paid
     */
    event RewardPaid(
        address indexed contentToken, 
        address indexed creator, 
        address rewardToken, 
        uint256 amount
    );
} 