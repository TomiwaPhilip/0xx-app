// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;


// Import necessary OpenZeppelin contracts
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

// Author: Adeyemi

/**
 * @title ReferralSystem
 * @dev Manages referrals and rewards for the Content Coining platform.
 */
contract ReferralSystem is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Define roles
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    bytes32 public constant REFERRAL_MANAGER_ROLE = keccak256("REFERRAL_MANAGER_ROLE");

    // Define reward structure
    struct RewardTier {
        uint256 minReferrals; // Minimum number of referrals to qualify for this tier
        uint256 rewardAmount; // Amount of reward tokens for this tier
    }

    // Mapping to track referrers for each user
    mapping(address => address) public referrers;

    // Mapping to track referral counts
    mapping(address => uint256) public referralCount;

    // Mapping to track referral activity (e.g., actions taken by referred users)
    mapping(address => uint256) public referralActivity;

    // Mapping to track if an address has been referred
    mapping(address => bool) public hasBeenReferred;

    // Anti-gaming mechanism: cooldown period between referral actions
    mapping(address => uint256) public lastActionTimestamp;
    uint256 public constant ACTION_COOLDOWN = 1 days;

    // Reward tiers
    RewardTier[] public rewardTiers;

    // Reward token
    IERC20 public rewardToken;

    // Events
    event ReferralRegistered(address indexed user, address indexed referrer);
    event ReferralActionRecorded(
        address indexed user,
        address indexed referrer,
        uint256 activity
    );
    event RewardDistributed(
        address indexed user,
        address indexed referrer,
        uint256 amount
    );
    event RewardTierAdded(uint256 minReferrals, uint256 rewardAmount);
    event RewardTierUpdated(
        uint256 index,
        uint256 minReferrals,
        uint256 rewardAmount
    );

    /**
     * @dev Constructor initializes the referral system.
     * @param admin Address receiving the DEFAULT_ADMIN_ROLE and REFERRAL_MANAGER_ROLE.
     * @param _rewardToken Address of the token used for rewards.
     */
    constructor(address admin, address _rewardToken) {
        require(admin != address(0), "ReferralSystem: Zero admin address");
        require(
            _rewardToken != address(0),
            "ReferralSystem: Zero token address"
        );

        _setupRole(ADMIN_ROLE, admin);
        _setupRole(REFERRAL_MANAGER_ROLE, admin);

        rewardToken = IERC20(_rewardToken);

        // Initialize with default tiers
        rewardTiers.push(
            RewardTier({minReferrals: 1, rewardAmount: 10 * 10 ** 18})
        ); // 10 tokens
        rewardTiers.push(
            RewardTier({minReferrals: 5, rewardAmount: 60 * 10 ** 18})
        ); // 60 tokens
        rewardTiers.push(
            RewardTier({minReferrals: 10, rewardAmount: 150 * 10 ** 18})
        ); // 150 tokens
    }

    modifier onlyRole(bytes32 role) {
        require(
            hasRole(role, msg.sender),
            "ReferralSystem: Caller does not have the required role"
        );
        _;
    }

    /**
     * @dev Function for users to register their referrer.
     * @param _referrer Address of the referrer.
     */
    function registerReferrer(address _referrer) external {
        require(
            _referrer != address(0),
            "ReferralSystem: Zero referrer address"
        );
        require(
            _referrer != msg.sender,
            "ReferralSystem: Cannot refer yourself"
        );
        require(
            referrers[msg.sender] == address(0),
            "ReferralSystem: Already referred"
        );
        require(
            !hasBeenReferred[_referrer],
            "ReferralSystem: Circular referral"
        );

        referrers[msg.sender] = _referrer;
        hasBeenReferred[msg.sender] = true;
        referralCount[_referrer]++;

        emit ReferralRegistered(msg.sender, _referrer);
    }

    /**
     * @dev Records a referral action, restricted to REFERRAL_MANAGER_ROLE.
     * @param _user Address of the user whose action is being recorded.
     */
    function recordReferralAction(
        address _user
    ) external {
        address referrer = referrers[_user];
        if (referrer == address(0)) return; // No referrer to credit

        // Anti-gaming: Check cooldown
        require(
            block.timestamp >= lastActionTimestamp[_user] + ACTION_COOLDOWN,
            "ReferralSystem: Action cooldown not elapsed"
        );

        // Update last action timestamp
        lastActionTimestamp[_user] = block.timestamp;

        // Increment referral activity
        referralActivity[referrer]++;

        emit ReferralActionRecorded(
            _user,
            referrer,
            referralActivity[referrer]
        );

        // Auto-distribute reward if applicable
        _distributeReward(referrer);
    }

    /**
     * @dev Allows eligible referrers to claim rewards manually.
     */
    function claimReward() external nonReentrant {
        _distributeReward(msg.sender);
    }

    /**
     * @dev Internal function to calculate and distribute rewards.
     * @param _referrer Address of the referrer.
     */
    function _distributeReward(address _referrer) internal {
        uint256 referrals = referralCount[_referrer];
        if (referrals == 0) return; // No referrals

        // Determine the applicable reward tier
        uint256 rewardAmount = 0;
        for (uint256 i = 0; i < rewardTiers.length; i++) {
            if (referrals >= rewardTiers[i].minReferrals) {
                rewardAmount = rewardTiers[i].rewardAmount;
            } else {
                break; // Stop once we've found the highest applicable tier
            }
        }

        if (rewardAmount == 0) return; // No reward applicable

        // Check contract token balance
        uint256 contractBalance = rewardToken.balanceOf(address(this));
        require(
            contractBalance >= rewardAmount,
            "ReferralSystem: Insufficient reward balance"
        );

        // Transfer reward
        rewardToken.safeTransfer(_referrer, rewardAmount);

        emit RewardDistributed(_referrer, _referrer, rewardAmount);
    }

    /**
     * @dev Adds a new reward tier, restricted to DEFAULT_ADMIN_ROLE.
     * @param _minReferrals Minimum referrals for the tier.
     * @param _rewardAmount Reward amount for the tier.
     */
    function addRewardTier(
        uint256 _minReferrals,
        uint256 _rewardAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardTiers.push(
            RewardTier({
                minReferrals: _minReferrals,
                rewardAmount: _rewardAmount
            })
        );

        emit RewardTierAdded(_minReferrals, _rewardAmount);
    }

    /**
     * @dev Updates an existing reward tier, restricted to DEFAULT_ADMIN_ROLE.
     * @param _index Index of the tier to update.
     * @param _minReferrals New minimum referrals.
     * @param _rewardAmount New reward amount.
     */
    function updateRewardTier(
        uint256 _index,
        uint256 _minReferrals,
        uint256 _rewardAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _index < rewardTiers.length,
            "ReferralSystem: Invalid tier index"
        );

        rewardTiers[_index].minReferrals = _minReferrals;
        rewardTiers[_index].rewardAmount = _rewardAmount;

        emit RewardTierUpdated(_index, _minReferrals, _rewardAmount);
    }

    /**
     * @dev Updates the reward token address, restricted to DEFAULT_ADMIN_ROLE.
     * @param _newToken New token address.
     */
    function setRewardToken(
        address _newToken
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newToken != address(0), "ReferralSystem: Zero token address");
        rewardToken = IERC20(_newToken);
    }

    /**
     * @dev Returns all reward tiers.
     * @return Array of reward tiers.
     */
    function getRewardTiers() external view returns (RewardTier[] memory) {
        return rewardTiers;
    }

    /**
     * @dev Gets the current reward tier for a referrer.
     * @param _referrer Address of the referrer.
     * @return tierIndex Index of the applicable tier.
     * @return rewardAmount Amount of the reward.
     */
    function getCurrentTier(
        address _referrer
    ) external view returns (uint256 tierIndex, uint256 rewardAmount) {
        uint256 referrals = referralCount[_referrer];

        for (uint256 i = 0; i < rewardTiers.length; i++) {
            if (referrals >= rewardTiers[i].minReferrals) {
                rewardAmount = rewardTiers[i].rewardAmount;
                tierIndex = i;
            } else {
                break;
            }
        }

        return (tierIndex, rewardAmount);
    }
}
