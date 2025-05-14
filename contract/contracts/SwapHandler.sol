// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

// Import necessary Uniswap V3 interfaces/contracts and OpenZeppelin contracts
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IContentToken.sol"; // For interacting with ContentToken rewards
import "./interfaces/ISwapHandler.sol"; // Import the interface for SwapHandler
import "./LiquidityManager.sol"; // Import for interaction with LiquidityManager

/**
 * @title SwapHandler
 * @dev Handles token swaps with reward distribution for ContentTokens
 */
contract SwapHandler is ISwapHandler, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Immutable addresses
    address public immutable WETH9;
    address public immutable swapRouter;
    address public liquidityManager;

    // Structs for swap processing
    struct ContentTradeContext {
        address ctAddress;
        address creator;
        bool isInitialMarket;
        IContentToken contentTokenInterface;
    }

    struct EthRewardProcessingState {
        uint256 totalEthRewardsPaidBySender;
        uint256 totalEthRewardsDeductedFromOutput;
        uint256 ethTradeReward;
        uint256 ethMarketBuyReward;
    }

    /**
     * @dev Constructor for SwapHandler
     * @param _swapRouter Address of Uniswap V3 SwapRouter
     * @param _WETH9 Address of WETH9
     * @param _admin Address of admin
     */
    constructor(
        address _swapRouter,
        address _WETH9,
        address _admin
    ) {
        require(_swapRouter != address(0), "SwapHandler: Zero router address");
        require(_WETH9 != address(0), "SwapHandler: Zero WETH9 address");
        require(_admin != address(0), "SwapHandler: Zero admin address");

        swapRouter = _swapRouter;
        WETH9 = _WETH9;

        // Set up roles
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    }
    
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "SwapHandler: Only role can call this function");
        _;
    }

    /**
     * @dev Sets the LiquidityManager contract address
     * @param _liquidityManager Address of the LiquidityManager contract
     */
    function setLiquidityManager(address _liquidityManager) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_liquidityManager != address(0), "SwapHandler: Zero address");
        liquidityManager = _liquidityManager;
    }

    /**
     * @dev Get content token information from LiquidityManager
     * @param params The swap parameters
     * @return context Content token trade context
     */
    function _getContentTokenTradeInfo(
        SwapParams calldata params
    ) internal view returns (ContentTradeContext memory context) {
        require(liquidityManager != address(0), "SwapHandler: LiquidityManager not set");

        address identifiedCtAddress = address(0);
        address identifiedCreator = address(0);
        bool isInitial = false;
        address pool;
        
        // Check tokenIn
        (address creator, bool isInitialMarket, address tokenPool) = LiquidityManager(payable(liquidityManager)).getContentTokenInfo(params.tokenIn);
        if (creator != address(0)) {
            // Get the pool from Uniswap Factory via LiquidityManager to verify it matches
            IUniswapV3Factory factory = IUniswapV3Factory(LiquidityManager(payable(liquidityManager)).factory());
            address currentPool = factory.getPool(params.tokenIn, params.tokenOut, params.fee);
            
            if (tokenPool == currentPool) {
                identifiedCtAddress = params.tokenIn;
                identifiedCreator = creator;
                isInitial = isInitialMarket;
                pool = currentPool;
            }
        }

        // If not found for tokenIn, check tokenOut
        if (identifiedCtAddress == address(0)) {
            (creator, isInitialMarket, tokenPool) = LiquidityManager(payable(liquidityManager)).getContentTokenInfo(params.tokenOut);
            if (creator != address(0)) {
                // Get the pool from Uniswap Factory to verify it matches
                IUniswapV3Factory factory = IUniswapV3Factory(LiquidityManager(payable(liquidityManager)).factory());
                address currentPool = factory.getPool(params.tokenIn, params.tokenOut, params.fee);
                
                if (tokenPool == currentPool) {
                    identifiedCtAddress = params.tokenOut;
                    identifiedCreator = creator;
                    isInitial = isInitialMarket;
                    pool = currentPool;
                }
            }
        }
        
        context.ctAddress = identifiedCtAddress;
        context.creator = identifiedCreator;
        context.isInitialMarket = isInitial;
        if (identifiedCtAddress != address(0)) {
            context.contentTokenInterface = IContentToken(identifiedCtAddress);
        } else {
            context.contentTokenInterface = IContentToken(address(0));
        }
        
        return context;
    }

    /**
     * @dev Handle creator coin sell reward and transfer in the input token
     * @param params The swap parameters
     * @param tradeContext The content token trade context
     * @return amountToSwap The amount of tokens to swap
     */
    function _handleCreatorCoinSellRewardAndTransferIn(
        SwapParams calldata params,
        ContentTradeContext memory tradeContext
    ) internal returns (uint256 amountToSwap) {
        amountToSwap = params.amountIn;

        if (
            tradeContext.isInitialMarket &&
            params.tokenIn == tradeContext.ctAddress && 
            params.tokenOut == WETH9 
        ) {
            uint256 creatorCoinReward = (params.amountIn * 5) / 1000; // 0.5%
            if (creatorCoinReward > 0 && params.amountIn > creatorCoinReward) {
                amountToSwap = params.amountIn - creatorCoinReward;
                IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
                IERC20(params.tokenIn).safeTransfer(tradeContext.ctAddress, creatorCoinReward);
                tradeContext.contentTokenInterface.depositReward(params.tokenIn, creatorCoinReward);
                emit RewardPaid(tradeContext.ctAddress, tradeContext.creator, params.tokenIn, creatorCoinReward);
                return amountToSwap;
            }
        }

        if (params.tokenIn != WETH9) {
            IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        }
        return amountToSwap; 
    }
    
    /**
     * @dev Calculate and deposit ETH rewards
     * @param params The swap parameters
     * @param tradeContext The content token trade context
     * @param amountInUsedForSwap The amount of input tokens used for swap
     * @param actualAmountOutFromUniswap The actual amount of output tokens from Uniswap
     * @return rewardsState The ETH reward processing state
     */
    function _calculateAndDepositETHRewards(
        SwapParams calldata params,
        ContentTradeContext memory tradeContext,
        uint256 amountInUsedForSwap,
        uint256 actualAmountOutFromUniswap
    ) internal returns (EthRewardProcessingState memory rewardsState) {
        if (tradeContext.ctAddress == address(0)) return rewardsState; // No CT, no ETH rewards

        // 1. Trade Reward (0.5% of trade value in ETH)
        if (params.tokenIn == WETH9) {
            rewardsState.ethTradeReward = (amountInUsedForSwap * 5) / 1000;
            rewardsState.totalEthRewardsPaidBySender += rewardsState.ethTradeReward;
        } else if (params.tokenOut == WETH9) {
            rewardsState.ethTradeReward = (actualAmountOutFromUniswap * 5) / 1000;
            if (actualAmountOutFromUniswap >= rewardsState.ethTradeReward) {
                rewardsState.totalEthRewardsDeductedFromOutput += rewardsState.ethTradeReward;
            } else {
                rewardsState.ethTradeReward = 0; 
            }
        }
        if (rewardsState.ethTradeReward > 0) {
            tradeContext.contentTokenInterface.depositReward{value: rewardsState.ethTradeReward}(WETH9, rewardsState.ethTradeReward);
            emit RewardPaid(tradeContext.ctAddress, tradeContext.creator, WETH9, rewardsState.ethTradeReward);
        }

        // 2. Market Rewards (only on initial market)
        if (tradeContext.isInitialMarket) {
            if (params.tokenIn == WETH9 && params.tokenOut == tradeContext.ctAddress) { // Buy of CT with WETH
                rewardsState.ethMarketBuyReward = (amountInUsedForSwap * 5) / 1000;
                rewardsState.totalEthRewardsPaidBySender += rewardsState.ethMarketBuyReward;
                tradeContext.contentTokenInterface.depositReward{value: rewardsState.ethMarketBuyReward}(WETH9, rewardsState.ethMarketBuyReward);
                emit RewardPaid(tradeContext.ctAddress, tradeContext.creator, WETH9, rewardsState.ethMarketBuyReward);
            }
        }
        return rewardsState;
    }

    /**
     * @dev Finalize ETH and refund
     * @param params The swap parameters
     * @param amountInUsedForSwap The amount of input tokens used for swap
     * @param actualAmountOutFromUniswap The actual amount of output tokens from Uniswap
     * @param finalRecipient The final recipient address
     * @param swapper The swapper address
     * @param rewardsState The ETH reward processing state
     * @param isCTTrade Whether this is a content token trade
     * @return netAmountOutForUser The net amount of output tokens for the user
     */
    function _finalizeETHAndRefund(
        SwapParams calldata params,
        uint256 amountInUsedForSwap,
        uint256 actualAmountOutFromUniswap,
        address payable finalRecipient,
        address payable swapper,
        EthRewardProcessingState memory rewardsState,
        bool isCTTrade // was a content token identified for rewards?
    ) internal returns (uint256 netAmountOutForUser) {
        netAmountOutForUser = actualAmountOutFromUniswap;

        if (isCTTrade) {
            // Check if enough ETH was sent by user for rewards sourced from input
            if (params.tokenIn == WETH9) {
                uint256 requiredValueFromSender = amountInUsedForSwap + rewardsState.totalEthRewardsPaidBySender;
                require(msg.value >= requiredValueFromSender, "SH: Insufficient ETH for swap and rewards");
                
                if (msg.value > requiredValueFromSender) {
                    uint256 refundAmount = msg.value - requiredValueFromSender;
                    (bool success, ) = swapper.call{value: refundAmount}("");
                    require(success, "SH: ETH refund to sender failed");
                }
            }

            if (params.tokenOut == WETH9) {
                uint256 finalAmountForUser = actualAmountOutFromUniswap - rewardsState.totalEthRewardsDeductedFromOutput;
                require(actualAmountOutFromUniswap >= rewardsState.totalEthRewardsDeductedFromOutput, "SH: Output < WETH rewards deduction");
                netAmountOutForUser = finalAmountForUser;
                
                if (finalAmountForUser > 0) {
                    (bool success, ) = finalRecipient.call{value: finalAmountForUser}("");
                    require(success, "SH: ETH transfer to recipient failed");
                }
            }
        } else { // Not a CT Trade, standard refund if tokenIn was WETH
            if (params.tokenIn == WETH9 && msg.value > amountInUsedForSwap) {
                (bool success, ) = swapper.call{value: msg.value - amountInUsedForSwap}("");
                require(success, "SH: ETH excess refund (non-CT) failed");
            }
            // If tokenOut was WETH and went to params.recipient directly, netAmountOutForUser is already actualAmountOutFromUniswap
        }
        return netAmountOutForUser;
    }

    /**
     * @dev Executes a swap through Uniswap V3, handling ContentToken creator rewards.
     * @param params The parameters for the swap.
     * @return amountOutForUser The net amount of tokenOut received by the recipient after rewards.
     */
    function swap(
        SwapParams calldata params
    ) external payable override nonReentrant returns (uint256 amountOutForUser) {
        ContentTradeContext memory tradeContext = _getContentTokenTradeInfo(params);

        uint256 amountInForSwap = _handleCreatorCoinSellRewardAndTransferIn(params, tradeContext);
        
        IERC20(params.tokenIn).approve(swapRouter, amountInForSwap);

        address payable swapRecipient;
        if (params.tokenOut == WETH9 && tradeContext.ctAddress != address(0)) {
            // SwapHandler receives WETH to manage deductions for rewards
            swapRecipient = payable(address(this));
        } else {
            // Tokens go directly to the final recipient
            swapRecipient = payable(params.recipient);
        }
        
        uint256 valueForUniswap = (params.tokenIn == WETH9) ? amountInForSwap : 0;
        if(params.tokenIn == WETH9) { // Ensure msg.value covers at least amountInForSwap for WETH input swaps
            require(msg.value >= amountInForSwap, "SH: Insufficient ETH for WETH input swap");
        }

        ISwapRouter.ExactInputSingleParams memory swapExecutionParams = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: params.fee,
                recipient: swapRecipient, 
                deadline: params.deadline,
                amountIn: amountInForSwap,
                amountOutMinimum: params.amountOutMinimum,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96
            });

        uint256 actualAmountOutFromUniswap = ISwapRouter(swapRouter).exactInputSingle{value: valueForUniswap}(swapExecutionParams);
        
        EthRewardProcessingState memory rewardsState = _calculateAndDepositETHRewards(
            params,
            tradeContext,
            amountInForSwap,
            actualAmountOutFromUniswap
        );

        amountOutForUser = _finalizeETHAndRefund(
            params,
            amountInForSwap,
            actualAmountOutFromUniswap,
            payable(params.recipient), // original intended recipient
            payable(msg.sender),      // original swapper for refunds
            rewardsState,
            tradeContext.ctAddress != address(0) // isCTTrade flag
        );

        // If tokenOut was WETH and went to SwapHandler, but it was NOT a CT trade,
        // _finalizeETHAndRefund would not have forwarded if isCTTrade was false.
        // This case needs to ensure WETH is forwarded if SH was recipient for non-CT WETH out.
        if (params.tokenOut == WETH9 && swapRecipient == payable(address(this)) && tradeContext.ctAddress == address(0)) {
            (bool success, ) = payable(params.recipient).call{value: actualAmountOutFromUniswap}("");
            require(success, "SH: ETH forward (non-CT, SH recipient) failed");
            amountOutForUser = actualAmountOutFromUniswap;
        }

        emit SwapExecuted(
            params.tokenIn,
            params.tokenOut,
            amountInForSwap, 
            actualAmountOutFromUniswap 
        );
        
        return amountOutForUser;
    }

    /**
     * @dev To receive ETH
     */
    receive() external payable {}
} 