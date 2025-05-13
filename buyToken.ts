import { ethers } from "ethers";

// --- ABIs (Replace with your actual ABIs) ---
const liquidityManagerABI = [ /* ... LiquidityManager ABI ... */ ];
const erc20ABI = [ /* ... Standard ERC20 ABI for WETH9 and ContentToken ... */ ];
const contentTokenABI = [ /* ... ContentToken ABI if you need specific functions beyond ERC20 ... */ ];


// --- Contract Addresses (Replace with your deployed addresses) ---
const liquidityManagerAddress = "0x...";
const weth9Address = "0x..."; // WETH9 contract address

// --- Helper: Get Provider and Signer ---
async function getProviderAndSigner() {
    if (!window.ethereum) {
        throw new Error("MetaMask not detected");
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []); // Request account access
    const signer = provider.getSigner();
    return { provider, signer };
}

// --- 1. Get Token Details ---
async function getTokenDetails(contentTokenAddress: string) {
    const { provider } = await getProviderAndSigner();
    const tokenContract = new ethers.Contract(contentTokenAddress, erc20ABI, provider); // or contentTokenABI

    try {
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        // For ContentToken specific details like contentURI:
        // const contentTokenSpecificContract = new ethers.Contract(contentTokenAddress, contentTokenABI, provider);
        // const uri = await contentTokenSpecificContract.contentURI();

        return {
            address: contentTokenAddress,
            name,
            symbol,
            decimals,
            // uri
        };
    } catch (error) {
        console.error("Error fetching token details:", error);
        throw error;
    }
}

// --- 2. Buy ContentToken with WETH9 ---
// Assumes user already has WETH9 (ERC20)
async function buyContentToken(
    contentTokenAddress: string,
    wethAmountToSpend: string, // e.g., "1.0" for 1 WETH
    expectedContentTokenAmountMin: string, // Minimum amount of ContentToken to receive (slippage protection)
    poolFeeTier: number // e.g., 3000 for 0.3%
) {
    const { signer } = await getProviderAndSigner();
    const userAddress = await signer.getAddress();

    const liquidityManager = new ethers.Contract(liquidityManagerAddress, liquidityManagerABI, signer);
    const wethContract = new ethers.Contract(weth9Address, erc20ABI, signer);

    try {
        // --- Approve LiquidityManager to spend WETH9 ---
        const wethDecimals = await wethContract.decimals();
        const wethAmountInWei = ethers.utils.parseUnits(wethAmountToSpend, wethDecimals);

        console.log(`Approving LiquidityManager to spend ${wethAmountToSpend} WETH9...`);
        const approveTx = await wethContract.approve(liquidityManagerAddress, wethAmountInWei);
        await approveTx.wait();
        console.log("WETH9 approval successful:", approveTx.hash);

        // --- Prepare Swap Parameters ---
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
        const contentTokenContract = new ethers.Contract(contentTokenAddress, erc20ABI, signer);
        const contentTokenDecimals = await contentTokenContract.decimals();
        const amountOutMinimumWei = ethers.utils.parseUnits(expectedContentTokenAmountMin, contentTokenDecimals);

        const swapParams = {
            tokenIn: weth9Address,
            tokenOut: contentTokenAddress,
            fee: poolFeeTier,
            recipient: userAddress,
            amountIn: wethAmountInWei,
            amountOutMinimum: amountOutMinimumWei,
            sqrtPriceLimitX96: 0, // 0 for no price limit (be cautious)
            deadline: deadline,
        };

        console.log("Executing swap to buy ContentToken...", swapParams);
        // Note: The `swap` function in LiquidityManager.sol is payable.
        // If tokenIn were native ETH, you'd send { value: wethAmountInWei }.
        // Since we are using ERC20 WETH9 and have approved it, msg.value should be 0.
        // The contract's `swap` function (lines 392-400) will use `safeTransferFrom` for ERC20 WETH9.
        const tx = await liquidityManager.swap(swapParams, { gasLimit: 300000 }); // Adjust gasLimit as needed
        console.log("Swap transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Swap successful! Receipt:", receipt);
        return receipt;

    } catch (error) {
        console.error("Error buying ContentToken:", error);
        throw error;
    }
}

// --- 3. Sell ContentToken for WETH9 ---
async function sellContentToken(
    contentTokenAddress: string,
    contentTokenAmountToSell: string, // e.g., "100.0"
    expectedWethAmountMin: string, // Minimum amount of WETH9 to receive
    poolFeeTier: number // e.g., 3000 for 0.3%
) {
    const { signer } = await getProviderAndSigner();
    const userAddress = await signer.getAddress();

    const liquidityManager = new ethers.Contract(liquidityManagerAddress, liquidityManagerABI, signer);
    const contentTokenContract = new ethers.Contract(contentTokenAddress, erc20ABI, signer);

    try {
        // --- Approve LiquidityManager to spend ContentToken ---
        const tokenDecimals = await contentTokenContract.decimals();
        const tokenAmountInWei = ethers.utils.parseUnits(contentTokenAmountToSell, tokenDecimals);

        console.log(`Approving LiquidityManager to spend ${contentTokenAmountToSell} ContentToken...`);
        const approveTx = await contentTokenContract.approve(liquidityManagerAddress, tokenAmountInWei);
        await approveTx.wait();
        console.log("ContentToken approval successful:", approveTx.hash);

        // --- Prepare Swap Parameters ---
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
        const wethContract = new ethers.Contract(weth9Address, erc20ABI, signer);
        const wethDecimals = await wethContract.decimals();
        const amountOutMinimumWei = ethers.utils.parseUnits(expectedWethAmountMin, wethDecimals);

        const swapParams = {
            tokenIn: contentTokenAddress,
            tokenOut: weth9Address,
            fee: poolFeeTier,
            recipient: userAddress,
            amountIn: tokenAmountInWei,
            amountOutMinimum: amountOutMinimumWei,
            sqrtPriceLimitX96: 0,
            deadline: deadline,
        };

        console.log("Executing swap to sell ContentToken...", swapParams);
        const tx = await liquidityManager.swap(swapParams, { gasLimit: 300000 }); // Adjust gasLimit
        console.log("Swap transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Swap successful! Receipt:", receipt);
        return receipt;

    } catch (error) {
        console.error("Error selling ContentToken:", error);
        throw error;
    }
}

// --- 4. Get Transaction History (Swaps for a specific user or token) ---
async function getSwapHistory(
    filterOptions?: { user?: string; tokenIn?: string; tokenOut?: string; }
) {
    const { provider } = await getProviderAndSigner(); // Or just provider if no signer needed
    const liquidityManager = new ethers.Contract(liquidityManagerAddress, liquidityManagerABI, provider);

    // Define the event filter
    // SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)
    const eventFilter = liquidityManager.filters.SwapExecuted(
        filterOptions?.tokenIn,  // null or undefined for any
        filterOptions?.tokenOut, // null or undefined for any
    );

    try {
        console.log("Fetching swap history...");
        // Query past events. You might want to specify block ranges for performance on mainnet.
        // e.g., provider.getBlockNumber() - 10000, "latest"
        const events = await liquidityManager.queryFilter(eventFilter);

        const formattedEvents = events.map(event => {
            // The recipient of the swap output is part of the SwapParams, not directly in SwapExecuted event.
            // However, the event logs who initiated the call to LiquidityManager if you parse the full transaction.
            // The SwapExecuted event itself (lines 64-69 in LiquidityManager.sol) logs tokenIn, tokenOut, amountIn, amountOut.
            // The `recipient` for the swap output is passed in `SwapParams` (line 376) to the `swap` function (line 388)
            // and then to Uniswap's `exactInputSingle` (line 411).
            // To find out who *received* the output tokens, you'd need to look at the `recipient` field
            // in the transaction input data for the `swap` call, or trace internal transactions if the recipient was another contract.
            // If the recipient was `msg.sender` (common), then the transaction sender got the tokens.

            return {
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber,
                tokenIn: event.args?.tokenIn,
                tokenOut: event.args?.tokenOut,
                amountIn: ethers.utils.formatUnits(event.args?.amountIn, /* decimals of tokenIn */), // You'd need to fetch decimals
                amountOut: ethers.utils.formatUnits(event.args?.amountOut, /* decimals of tokenOut */), // You'd need to fetch decimals
                // To get the user who initiated the swap (msg.sender to LiquidityManager.swap):
                // const txDetails = await provider.getTransaction(event.transactionHash);
                // initiator: txDetails.from
            };
        });

        // If a user filter is provided, you'd need to fetch transaction details for each event
        // and check `tx.from` if the swap recipient was always `msg.sender`.
        // This client-side filtering can be intensive.
        // For more advanced querying, an indexing service (like The Graph) is recommended.

        console.log("Swap history:", formattedEvents);
        return formattedEvents;
    } catch (error) {
        console.error("Error fetching swap history:", error);
        throw error;
    }
}

// --- Example Usage ---
async function main() {
    try {
        const someContentTokenAddress = "0x...YOUR_CONTENT_TOKEN_ADDRESS..."; // Replace
        const knownPoolFeeTier = 3000; // Example: 0.3%

        // 1. Get details
        const details = await getTokenDetails(someContentTokenAddress);
        console.log("Token Details:", details);

        // 2. Buy Token (Example: Buy with 0.1 WETH)
        // Make sure the user has 0.1 WETH and has approved LiquidityManager
        // await buyContentToken(someContentTokenAddress, "0.1", "95", knownPoolFeeTier); // Expect at least 95 ContentTokens

        // 3. Sell Token (Example: Sell 50 ContentTokens)
        // Make sure user has 50 ContentTokens and has approved LiquidityManager
        // await sellContentToken(someContentTokenAddress, "50", "0.045", knownPoolFeeTier); // Expect at least 0.045 WETH

        // 4. Get history
        await getSwapHistory({ tokenOut: someContentTokenAddress }); // Swaps where this token was bought

    } catch (e) {
        console.error("Main execution error:", e);
    }
}

// main(); // Uncomment to run