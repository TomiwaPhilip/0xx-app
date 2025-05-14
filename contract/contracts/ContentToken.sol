// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

// Import necessary OpenZeppelin contracts
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol"; // For safe ETH and token transfers
import "./interfaces/ILiquidityManager.sol";

/**
 * @title ContentToken
 * @dev ERC20 token representing a specific piece of content.
 *      Minting is typically controlled by the ContentFactory or an admin.
 *      Includes vesting for the content creator and uses AccessControl.
 *      Designed to be cloneable, so uses an initializer pattern.
 */
contract ContentToken is ERC20, ERC20Burnable, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables for ERC20 name and symbol, settable during initialization
    string private _tokenName;
    string private _tokenSymbol;

    // Metadata storage
    string public contentURI;

    // Store the creator of this token
    address public contentCreator;

    // Address of WETH, used for ETH-based rewards
    address public WETH_ADDRESS; // Needs to be set in initialize

    // Address of the LiquidityManager, to authorize reward deposits
    address public liquidityManagerAddress; // Needs to be set in initialize

    // Rewards accrued by the content creator
    // mapping: rewardTokenAddress => amount
    mapping(address => uint256) public accruedRewards;

    // Set the total token supply cap (1 billion tokens with 18 decimals)
    uint256 public constant TOKEN_CAP = 1_000_000_000 * (10 ** 18);

    // Rate limiting for minting
    uint256 public constant MINT_RATE_LIMIT = TOKEN_CAP / 10; // 10% of total supply per period
    uint256 public mintedInPeriod;
    uint256 public mintPeriodReset;
    uint256 public constant MINT_PERIOD = 1 days;

    // Initializer guard
    bool private _initialized;

    // Events
    event ContentURIUpdated(string oldURI, string newURI);
    event RewardDeposited(address indexed by, address indexed rewardToken, uint256 amount);
    event RewardClaimed(address indexed by, address indexed rewardToken, uint256 amount);

    /**
     * @dev Constructor for the implementation contract.
     *      Called only once when the base ContentToken contract is deployed.
     *      Clones will not execute this constructor.
     */
    constructor() ERC20("ContentTokenImpl", "CTI") {
        // This constructor is for the master/implementation contract.
        // ERC20 name and symbol here are placeholders for the implementation.
        // Cloned instances will set their actual name and symbol via initialize().
    }

    /**
     * @dev Initializes the token state. Called once after cloning.
     * @param name_ The name of the token.
     * @param symbol_ The symbol of the token.
     * @param initialAdmin The address granted the DEFAULT_ADMIN_ROLE initially.
     * @param currentContentURI Link to the content metadata (e.g., IPFS hash).
     * @param creatorAddress The address of the content creator.
     * @param _WETH_ADDRESS Address of WETH for reward calculations.
     * @param _liquidityManagerAddress Address of the LiquidityManager for authorized deposits.
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        address initialAdmin,
        string memory currentContentURI,
        address creatorAddress,
        address _WETH_ADDRESS,
        address _liquidityManagerAddress
    ) external {
        require(!_initialized, "ContentToken: already initialized");
        _initialized = true;

        _tokenName = name_;
        _tokenSymbol = symbol_;

        require(
            initialAdmin != address(0),
            "ContentToken: Initial admin cannot be zero address"
        );
        require(
            creatorAddress != address(0),
            "ContentToken: Creator cannot be zero address"
        );
        require(
            _WETH_ADDRESS != address(0),
            "ContentToken: WETH address cannot be zero"
        );
        require(
            _liquidityManagerAddress != address(0),
            "ContentToken: LiquidityManager address cannot be zero"
        );

        // Grant DEFAULT_ADMIN_ROLE to initialAdmin
        _setupRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        // Set content URI
        contentURI = currentContentURI;
        // Set the content creator
        contentCreator = creatorAddress;
        // Set WETH address
        WETH_ADDRESS = _WETH_ADDRESS;
        // Set LiquidityManager address
        liquidityManagerAddress = _liquidityManagerAddress;

        // Initialize rate limiting
        mintPeriodReset = block.timestamp + MINT_PERIOD; // Rate limit period starts from initialization
        mintedInPeriod = 0;
    }

    /**
     * @dev Returns the name of the token. Overrides ERC20.sol.
     */
    function name() public view virtual override returns (string memory) {
        return _tokenName;
    }

    /**
     * @dev Returns the symbol of the token. Overrides ERC20.sol.
     */
    function symbol() public view virtual override returns (string memory) {
        return _tokenSymbol;
    }

    /**
     * @dev Mints tokens.
     * Enforces cap and implements rate limiting.
     * @param to The address to mint tokens to.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external virtual {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "ContentToken: Caller is not an admin");
        require(
            totalSupply() + amount <= TOKEN_CAP,
            "ContentToken: cap exceeded"
        );

        // Implement rate limiting
        // The initial creator allocation is minted by the factory and bypasses this.
        // This rate limit applies to subsequent mints by other authorized minters (e.g., admin).
        if (block.timestamp >= mintPeriodReset) {
            // Reset rate limit for new period
            mintPeriodReset = block.timestamp + MINT_PERIOD;
            mintedInPeriod = 0;
        }

        require(
            mintedInPeriod + amount <= MINT_RATE_LIMIT,
            "ContentToken: mint rate limit exceeded"
        );
        mintedInPeriod += amount;

        _mint(to, amount);
    }

    /**
     * @dev Function to update content URI (restricted to admin).
     * @param _newURI The new URI for the content metadata.
     */
    function setContentURI(string memory _newURI) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "ContentToken: must have admin role"
        );
        string memory oldURI = contentURI;
        contentURI = _newURI;
        emit ContentURIUpdated(oldURI, _newURI);
    }

    /**
     * @dev Deposits rewards for the content creator.
     * Can be called by the LiquidityManager.
     * For ETH rewards, msg.value should contain the ETH amount.
     * For token rewards (including this ContentToken), the tokens must be sent to this contract first,
     * and then this function is called.
     * @param rewardToken The address of the token being deposited as a reward.
     * @param amount The amount of the reward.
     */
    function depositReward(address rewardToken, uint256 amount) external payable nonReentrant {
        require(msg.sender == liquidityManagerAddress, "ContentToken: Only LiquidityManager can deposit rewards");
        require(amount > 0, "ContentToken: Reward amount must be greater than zero");

        if (rewardToken == WETH_ADDRESS) {
            require(msg.value == amount, "ContentToken: msg.value must match ETH reward amount");
            // ETH is already in the contract via msg.value
            accruedRewards[rewardToken] += amount;
        } else if (rewardToken == address(this)) {
            // For rewards in this ContentToken, ensure this contract has received them.
            // LiquidityManager should transfer these tokens to this contract BEFORE calling depositReward.
            // No direct minting here to keep supply control separate unless explicitly designed.
            // We assume the LiquidityManager has transferred 'amount' of 'rewardToken' (this token) to this contract.
            accruedRewards[rewardToken] += amount;
        } else {
            revert("ContentToken: Unsupported reward token for direct deposit handling");
            // If other ERC20s are used as rewards and sent by LiquidityManager,
            // similar logic to address(this) would apply: LM transfers them here first.
        }

        emit RewardDeposited(contentCreator, rewardToken, amount);
    }

    /**
     * @dev Allows the content creator to claim their accrued rewards.
     * @param rewardTokenAddress The address of the token to claim.
     * @param amountToClaim The amount of tokens to claim.
     */
    function claimRewards(address rewardTokenAddress, uint256 amountToClaim) external nonReentrant {
        require(msg.sender == contentCreator, "ContentToken: Only creator can claim rewards");
        require(amountToClaim > 0, "ContentToken: Claim amount must be positive");
        require(accruedRewards[rewardTokenAddress] >= amountToClaim, "ContentToken: Insufficient accrued rewards");

        accruedRewards[rewardTokenAddress] -= amountToClaim;

        if (rewardTokenAddress == WETH_ADDRESS) {
            payable(contentCreator).transfer(amountToClaim);
        } else {
            IERC20(rewardTokenAddress).safeTransfer(contentCreator, amountToClaim);
        }

        emit RewardClaimed(contentCreator, rewardTokenAddress, amountToClaim);
    }
}
