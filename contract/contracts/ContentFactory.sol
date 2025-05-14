// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

// Import necessary contracts and interfaces
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./ContentToken.sol";
import "./LiquidityManager.sol";
import "./ReferralSystem.sol";

struct TokenCreationParams {
    string name;
    string symbol;
    string contentURI;
    address creator;
    address initialMintRecipient;
    uint256 initialMintAmount;
}

/**
 * @title ContentFactory
 * @dev Factory contract for creating new ContentToken instances.
 *      Manages the overall platform settings and interacts
 *      with LiquidityManager and ReferralSystem upon token creation.
 */
contract ContentFactory is AccessControl {
    // Define roles
    bytes32 public constant CONTENT_CREATOR_ROLE =
        keccak256("CONTENT_CREATOR_ROLE");
    bytes32 public constant REFERRAL_MANAGER_ROLE =
        keccak256("REFERRAL_MANAGER_ROLE");

    // Store addresses of system components
    address public contentTokenImplementation;
    LiquidityManager public liquidityManager;
    ReferralSystem public referralSystem;
    address public stablecoinAddress; // Address of the stablecoin for pairing
    address public WETH_ADDRESS; // Address of WETH for rewards
    uint24 public defaultFeeTier; // Default Uniswap V3 fee tier

    // Track created tokens
    address[] public createdTokens;
    mapping(address => bool) public isContentToken;

    // Event emitted when a new ContentToken is created
    event ContentTokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        string contentURI
    );

    /**
     * @dev Constructor sets up the factory.
     * @param _initialAdmin Address receiving the DEFAULT_ADMIN_ROLE.
     * @param _tokenImplementation Address of the deployed ContentToken logic contract.
     * @param _liquidityManager Address of the LiquidityManager contract.
     * @param _referralSystem Address of the ReferralSystem contract.
     * @param _stablecoin Address of the stablecoin to pair with.
     * @param _defaultFee Default Uniswap V3 fee tier for new pools.
     * @param _WETH_ADDRESS Address of WETH for reward calculations.
     */
    constructor(
        address _initialAdmin,
        address _tokenImplementation,
        address _liquidityManager,
        address _referralSystem,
        address _stablecoin,
        uint24 _defaultFee,
        address _WETH_ADDRESS
    ) {
        require(_initialAdmin != address(0), "Factory: Zero admin address");
        require(
            _tokenImplementation != address(0),
            "Factory: Zero implementation"
        );
        require(_WETH_ADDRESS != address(0), "Factory: Zero WETH address");

        // Grant DEFAULT_ADMIN_ROLE
        _setupRole(DEFAULT_ADMIN_ROLE, _initialAdmin);
        // Grant CONTENT_CREATOR_ROLE to admin initially
        _setupRole(CONTENT_CREATOR_ROLE, _initialAdmin);
        // Grant REFERRAL_MANAGER_ROLE to admin initially
        _setupRole(REFERRAL_MANAGER_ROLE, _initialAdmin);

        // Set implementation and component addresses
        contentTokenImplementation = _tokenImplementation;
        liquidityManager = LiquidityManager(payable(_liquidityManager));
        referralSystem = ReferralSystem(_referralSystem);
        stablecoinAddress = _stablecoin;
        WETH_ADDRESS = _WETH_ADDRESS;
        defaultFeeTier = _defaultFee;
    }

    /**
     * @dev Modifier to restrict access to allowed roles.
     * This is used for functions that should only be callable by content creators.
     */
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "Not authorized");
        _;
    }

    /**
     * @dev Creates a new ContentToken instance using Clones.
     * Restricted to addresses with CONTENT_CREATOR_ROLE.
     * Initializes the token and potentially creates a Uniswap pool.
     * @param params Struct containing token creation parameters.
     * @return The address of the newly created ContentToken.
     */
    function createContentToken(
        TokenCreationParams calldata params
    ) external onlyRole(CONTENT_CREATOR_ROLE) returns (address) {
        // Create a new instance of ContentToken
        address newToken = Clones.clone(contentTokenImplementation);
        ContentToken token = ContentToken(newToken);

        bytes memory initData = abi.encodeWithSignature(
            "initialize(string,string,address,string,address,address,address)",
            params.name,
            params.symbol,
            address(this),
            params.contentURI,
            params.creator,
            WETH_ADDRESS,
            address(liquidityManager)
        );

        // Call the initialize function on the cloned contract
        (bool success, ) = newToken.call(initData);
        require(success, "Token initialization failed");

        // Perform initial mint if required
        if (params.initialMintAmount > 0) {
            token.mint(params.initialMintRecipient, params.initialMintAmount);
        }

        // Optionally create the Uniswap V3 pool via LiquidityManager
        if (address(liquidityManager) != address(0)) {
            address poolAddress = liquidityManager.createPool(newToken, defaultFeeTier);
            if (poolAddress != address(0)) {
                liquidityManager.registerContentToken(newToken, params.creator);
            }
        }

        // Record the created token
        createdTokens.push(newToken);
        isContentToken[newToken] = true;

        // Emit the event
        emit ContentTokenCreated(
            newToken,
            msg.sender,
            params.name,
            params.symbol,
            params.contentURI
        );

        // Interact with ReferralSystem if needed
        if (address(referralSystem) != address(0)) {
            // Record an action for the creator's referrer
            referralSystem.recordReferralAction(params.creator);
        }

        return newToken;
    }

    /**
     * @dev Grants CONTENT_CREATOR_ROLE to an account.
     * @param account Address to receive the role.
     */
    function grantContentCreatorRole(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(CONTENT_CREATOR_ROLE, account);
    }

    /**
     * @dev Revokes CONTENT_CREATOR_ROLE from an account.
     * @param account Address to lose the role.
     */
    function revokeContentCreatorRole(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(CONTENT_CREATOR_ROLE, account);
    }

    /**
     * @dev Updates the token implementation address.
     * @param _newImplementation New implementation address.
     */
    function setTokenImplementation(
        address _newImplementation
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _newImplementation != address(0),
            "Factory: Zero implementation"
        );
        contentTokenImplementation = _newImplementation;
    }

    /**
     * @dev Updates the liquidity manager address.
     * @param _newManager New manager address.
     */
    function setLiquidityManager(
        address _newManager
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        liquidityManager = LiquidityManager(payable(_newManager));
    }

    /**
     * @dev Updates the referral system address.
     * @param _newSystem New system address.
     */
    function setReferralSystem(
        address _newSystem
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        referralSystem = ReferralSystem(_newSystem);
    }

    /**
     * @dev Updates the stablecoin address.
     * @param _newStablecoin New stablecoin address.
     */
    function setStablecoinAddress(
        address _newStablecoin
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newStablecoin != address(0), "Factory: Zero stablecoin");
        stablecoinAddress = _newStablecoin;
    }

    /**
     * @dev Updates the WETH address.
     * @param _newWETH New WETH address.
     */
    function setWETHAddress(
        address _newWETH
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newWETH != address(0), "Factory: Zero WETH address");
        WETH_ADDRESS = _newWETH;
    }

    /**
     * @dev Updates the default fee tier.
     * @param _newFee New fee tier.
     */
    function setDefaultFeeTier(
        uint24 _newFee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultFeeTier = _newFee;
    }

    /**
     * @dev Returns all created tokens.
     * @return Array of token addresses.
     */
    function getCreatedTokens() external view returns (address[] memory) {
        return createdTokens;
    }
}
