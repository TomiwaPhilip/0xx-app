// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

// Import necessary Uniswap V3 interfaces/contracts and OpenZeppelin contracts
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IContentToken.sol"; // For interacting with ContentToken rewards
import "./interfaces/ISwapHandler.sol"; // Import the interface for SwapHandler

/**
 * @title LiquidityManager
 * @dev Handles Uniswap V3 pool creation and liquidity management for ContentTokens.
 */
contract LiquidityManager is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Define roles
    bytes32 public constant POOL_CREATOR_ROLE = keccak256("POOL_CREATOR_ROLE");
    bytes32 public constant LIQUIDITY_PROVIDER_ROLE =
        keccak256("LIQUIDITY_PROVIDER_ROLE");

    // Uniswap addresses
    address public immutable factory;
    address public immutable WETH9;
    address public immutable nonfungiblePositionManager;
    address public immutable swapRouter;
    address public contentFactoryAddress; // Settable address of the ContentFactory
    address public swapHandlerAddress; // Address of the SwapHandler contract

    // Maps tokenId to its owner
    mapping(uint256 => address) public tokenIdToOwner;

    // Mapping to track created pools (ContentToken address => its initial market pool address)
    mapping(address => address) public tokenToPair;

    // Registry for ContentToken specific information
    struct ContentTokenInfo {
        address creator;
        address tokenAddress; // Maintained for explicit clarity, though key is tokenAddress
    }
    mapping(address => ContentTokenInfo) public contentTokenRegistry; // contentTokenAddress => Info

    // Fee tier options (Uniswap V3 supports multiple fee tiers)
    uint24 public constant FEE_LOWEST = 100; // 0.01%
    uint24 public constant FEE_LOW = 500; // 0.05%
    uint24 public constant FEE_MEDIUM = 3000; // 0.3%
    uint24 public constant FEE_HIGH = 10000; // 1%

    // Events
    event PoolCreated(
        address indexed token0,
        address indexed token1,
        uint24 fee,
        address pool
    );
    event PositionMinted(
        address indexed owner,
        uint256 tokenId,
        uint128 liquidity
    );
    event LiquidityDecreased(
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    event FeesCollected(uint256 tokenId, uint256 amount0, uint256 amount1);
    event SwapHandlerSet(address indexed handler);

    /**
     * @dev Constructor to set Uniswap V3 addresses and roles
     * @param _nonfungiblePositionManager The address of Uniswap V3 NonfungiblePositionManager
     * @param _swapRouter The address of Uniswap V3 SwapRouter
     * @param _factory The address of Uniswap V3 Factory
     * @param _WETH9 The address of WETH9
     * @param _admin The address to receive admin role
     */
    constructor(
        address _nonfungiblePositionManager,
        address _swapRouter,
        address _factory,
        address _WETH9,
        address _admin
    ) {
        require(
            _nonfungiblePositionManager != address(0),
            "LiquidityManager: Zero NPM address"
        );
        require(
            _swapRouter != address(0),
            "LiquidityManager: Zero router address"
        );
        require(
            _factory != address(0),
            "LiquidityManager: Zero factory address"
        );
        require(_WETH9 != address(0), "LiquidityManager: Zero WETH9 address");
        require(_admin != address(0), "LiquidityManager: Zero admin address");

        nonfungiblePositionManager = _nonfungiblePositionManager;
        swapRouter = _swapRouter;
        factory = _factory;
        WETH9 = _WETH9;

        // Set up roles - use _setupRole for initial setup instead of grantRole
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(POOL_CREATOR_ROLE, _admin);
        _setupRole(LIQUIDITY_PROVIDER_ROLE, _admin);
    }

    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "LiquidityManager: Access denied");
        _;
    }

    modifier onlyContentFactory() {
        require(msg.sender == contentFactoryAddress, "LM: Caller is not ContentFactory");
        _;
    }

    modifier onlySwapHandler() {
        require(msg.sender == swapHandlerAddress, "LM: Caller is not SwapHandler");
        _;
    }

    /**
     * @dev Sets the ContentFactory address.
     * Can only be called by an admin.
     * @param _newFactoryAddress The new address of the ContentFactory.
     */
    function setContentFactoryAddress(address _newFactoryAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newFactoryAddress != address(0), "LM: New factory address cannot be zero");
        contentFactoryAddress = _newFactoryAddress;
    }

    /**
     * @dev Sets the SwapHandler address
     * Can only be called by an admin
     * @param _swapHandlerAddress The address of the SwapHandler contract
     */
    function setSwapHandlerAddress(address _swapHandlerAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_swapHandlerAddress != address(0), "LM: New SwapHandler address cannot be zero");
        swapHandlerAddress = _swapHandlerAddress;
        emit SwapHandlerSet(_swapHandlerAddress);
    }

    /**
     * @dev Registers information about a ContentToken.
     * Called by ContentFactory when a new token and its initial pool are created.
     * @param tokenAddr The address of the ContentToken.
     * @param creatorAddr The address of the ContentToken's creator.
     */
    function registerContentToken(address tokenAddr, address creatorAddr) external onlyContentFactory {
        require(tokenAddr != address(0), "LM: Zero token address");
        require(creatorAddr != address(0), "LM: Zero creator address");
        contentTokenRegistry[tokenAddr] = ContentTokenInfo({
            creator: creatorAddr,
            tokenAddress: tokenAddr
        });
    }

    /**
     * @dev Creates a new Uniswap V3 pool for a ContentToken (typically paired with WETH or stablecoin)
     * @param token The ContentToken address
     * @param fee The fee tier (100, 500, 3000, or 10000)
     * @return pool The address of the created pool
     */
    function createPool(
        address token,
        uint24 fee
    ) external onlyRole(POOL_CREATOR_ROLE) returns (address pool) {
        require(token != address(0), "LiquidityManager: Zero token address");
        require(tokenToPair[token] == address(0), "LiquidityManager: Initial market pool already exists for this token");
        require(
            fee == FEE_LOWEST ||
                fee == FEE_LOW ||
                fee == FEE_MEDIUM ||
                fee == FEE_HIGH,
            "LiquidityManager: Invalid fee tier"
        );

        // Create the pool through Uniswap V3 Factory
        // We're assuming token will be paired with WETH9
        // For deterministic sorting of tokens, we use sortTokens internally
        (address token0, address token1) = token < WETH9
            ? (token, WETH9)
            : (WETH9, token);

        // Check if pool already exists
        pool = IUniswapV3Factory(factory).getPool(token0, token1, fee);
        require(pool == address(0), "LiquidityManager: Pool already exists with this fee tier"); // More precise error

        pool = IUniswapV3Factory(factory).createPool(token0, token1, fee);
        require(pool != address(0), "LiquidityManager: Pool creation failed");

        // Track the pool
        tokenToPair[token] = pool;

        // Initialize pool with a sqrtPriceX96
        // This is a simplified example - in a real implementation, you should
        // calculate an appropriate starting price based on token values
        uint160 sqrtPriceX96 = 79228162514264337593543950336; // Example 1:1 Price
        IUniswapV3Pool(pool).initialize(sqrtPriceX96);

        emit PoolCreated(token0, token1, fee, pool);
        return pool;
    }

    /**
     * @dev Struct to hold parameters for the mintNewPosition function
     */
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    /**
     * @dev Adds liquidity to a Uniswap V3 pool by minting a new position
     * @param params The parameters for minting a new position
     * @return tokenId The ID of the NFT representing the position
     * @return liquidity The amount of liquidity added
     * @return amount0 The amount of token0 added
     * @return amount1 The amount of token1 added
     */
    function mintNewPosition(
        MintParams calldata params
    )
        external
        payable
        nonReentrant
        onlyRole(LIQUIDITY_PROVIDER_ROLE)
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        // Transfer tokens to this contract first
        if (params.token0 == WETH9 && msg.value >= params.amount0Desired) {
            // Handling native ETH for WETH - wrap it
            // This is a simplified example, in practice would need a full wrapping mechanism
        } else {
            IERC20(params.token0).safeTransferFrom(
                msg.sender,
                address(this),
                params.amount0Desired
            );
        }

        if (params.token1 != WETH9 || msg.value < params.amount0Desired) {
            IERC20(params.token1).safeTransferFrom(
                msg.sender,
                address(this),
                params.amount1Desired
            );
        }

        // Approve the position manager to spend tokens
        IERC20(params.token0).approve(
            nonfungiblePositionManager,
            params.amount0Desired
        );
        IERC20(params.token1).approve(
            nonfungiblePositionManager,
            params.amount1Desired
        );

        // Convert to INonfungiblePositionManager.MintParams
        INonfungiblePositionManager.MintParams
            memory mintParams = INonfungiblePositionManager.MintParams({
                token0: params.token0,
                token1: params.token1,
                fee: params.fee,
                tickLower: params.tickLower,
                tickUpper: params.tickUpper,
                amount0Desired: params.amount0Desired,
                amount1Desired: params.amount1Desired,
                amount0Min: params.amount0Min,
                amount1Min: params.amount1Min,
                recipient: address(this),
                deadline: params.deadline
            });

        // Mint the position
        (tokenId, liquidity, amount0, amount1) = INonfungiblePositionManager(
            nonfungiblePositionManager
        ).mint(mintParams);

        // Record ownership
        tokenIdToOwner[tokenId] = msg.sender;

        // Refund any unused ETH
        if (msg.value > 0) {
            if (params.token0 == WETH9 && amount0 < params.amount0Desired) {
                uint256 refund = params.amount0Desired - amount0;
                (bool success, ) = msg.sender.call{value: refund}("");
                require(success, "LiquidityManager: ETH transfer failed");
            } else if (
                params.token1 == WETH9 && amount1 < params.amount1Desired
            ) {
                uint256 refund = params.amount1Desired - amount1;
                (bool success, ) = msg.sender.call{value: refund}("");
                require(success, "LiquidityManager: ETH transfer failed");
            }
        }

        emit PositionMinted(msg.sender, tokenId, liquidity);
        return (tokenId, liquidity, amount0, amount1);
    }

    /**
     * @dev Struct to hold parameters for the decreaseLiquidity function
     */
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    /**
     * @dev Removes liquidity from a position
     * @param params The parameters for decreasing liquidity
     * @return amount0 The amount of token0 removed
     * @return amount1 The amount of token1 removed
     */
    function decreaseLiquidity(
        DecreaseLiquidityParams calldata params
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        // Verify ownership
        require(
            tokenIdToOwner[params.tokenId] == msg.sender,
            "LiquidityManager: Not owner of NFT"
        );

        // Convert to INonfungiblePositionManager.DecreaseLiquidityParams
        INonfungiblePositionManager.DecreaseLiquidityParams
            memory decreaseParams = INonfungiblePositionManager
                .DecreaseLiquidityParams({
                    tokenId: params.tokenId,
                    liquidity: params.liquidity,
                    amount0Min: params.amount0Min,
                    amount1Min: params.amount1Min,
                    deadline: params.deadline
                });

        // Decrease the liquidity
        (amount0, amount1) = INonfungiblePositionManager(
            nonfungiblePositionManager
        ).decreaseLiquidity(decreaseParams);

        emit LiquidityDecreased(
            params.tokenId,
            params.liquidity,
            amount0,
            amount1
        );

        // Note: Tokens are still in the position and need to be collected in a separate call
        return (amount0, amount1);
    }

    /**
     * @dev Struct to hold parameters for the collect function
     */
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    /**
     * @dev Collects tokens from a position
     * @param params The parameters for collecting tokens
     * @return amount0 The amount of token0 collected
     * @return amount1 The amount of token1 collected
     */
    function collect(
        CollectParams calldata params
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        // Verify ownership
        require(
            tokenIdToOwner[params.tokenId] == msg.sender,
            "LiquidityManager: Not owner of NFT"
        );

        // Convert to INonfungiblePositionManager.CollectParams
        INonfungiblePositionManager.CollectParams
            memory collectParams = INonfungiblePositionManager.CollectParams({
                tokenId: params.tokenId,
                recipient: params.recipient,
                amount0Max: params.amount0Max,
                amount1Max: params.amount1Max
            });

        // Collect the tokens
        (amount0, amount1) = INonfungiblePositionManager(
            nonfungiblePositionManager
        ).collect(collectParams);

        emit FeesCollected(params.tokenId, amount0, amount1);
        return (amount0, amount1);
    }

    /**
     * @dev Transfers ownership of a position NFT
     * @param tokenId The ID of the position NFT
     * @param newOwner The address of the new owner
     */
    function transferPosition(uint256 tokenId, address newOwner) external {
        require(tokenIdToOwner[tokenId] == msg.sender, "LiquidityManager: Not owner of NFT");
        require(newOwner != address(0), "LiquidityManager: Zero address");
        INonfungiblePositionManager(nonfungiblePositionManager).safeTransferFrom(address(this), newOwner, tokenId);
        tokenIdToOwner[tokenId] = newOwner;
    }

    /**
     * @dev Grants the POOL_CREATOR_ROLE to an account
     * @param account The address to receive the role
     */
    function grantPoolCreatorRole(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(POOL_CREATOR_ROLE, account);
    }

    /**
     * @dev Grants the LIQUIDITY_PROVIDER_ROLE to an account
     * @param account The address to receive the role
     */
    function grantLiquidityProviderRole(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(LIQUIDITY_PROVIDER_ROLE, account);
    }

    /**
     * @dev Allow the SwapHandler contract to retrieve ContentToken info
     * @param tokenAddress The address of the ContentToken to look up
     * @return creator The creator address
     * @return isInitialMarket Whether this is the initial market pool
     * @return pool The pool address
     */
    function getContentTokenInfo(address tokenAddress) 
        external 
        view 
        returns (address creator, bool isInitialMarket, address pool) 
    {
        ContentTokenInfo memory info = contentTokenRegistry[tokenAddress];
        return (
            info.creator, 
            tokenToPair[tokenAddress] != address(0), 
            tokenToPair[tokenAddress]
        );
    }

    /**
     * @dev To receive ETH when collecting/unwrapping WETH
     */
    receive() external payable {}
}
