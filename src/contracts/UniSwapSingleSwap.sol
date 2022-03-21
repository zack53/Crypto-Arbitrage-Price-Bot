// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;
pragma abicoder v2;

import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

contract UniSwapSingleSwap { 
    // For the scope of these swap examples,
    // we will detail the design considerations when using
    // `exactInput`, `exactInputSingle`, `exactOutput`, and  `exactOutputSingle`.

    // It should be noted that for the sake of these examples, we purposefully pass in the swap router instead of inherit the swap router for simplicity.
    // More advanced example contracts will detail how to inherit the swap router safely.

    ISwapRouter public immutable swapRouter;

    // This example swaps WBTC/WETH9 for single path swaps and WBTC/USDT/WETH9 for multi path swaps.

    //address public constant WBTC = 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599;
    //address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    //address public constant USDT = 0xdac17f958d2ee523a2206206994597c13d831ec7;

    // For this example, we will set the pool fee to 0.3%.
    //uint24 public constant poolFee = 3000;

    constructor(ISwapRouter _swapRouter) {
        swapRouter = _swapRouter;
    }

    /// @notice swapExactInputSingle swaps a fixed amount of WBTC for a maximum possible amount of WETH9
    /// using the WBTC/WETH9 0.3% pool by calling `exactInputSingle` in the swap router.
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its WBTC for this function to succeed.
    /// @param amountIn The exact amount of WBTC that will be swapped for WETH9.
    /// @return amountOut The amount of WETH9 received.
    function swapExactInputSingle(uint256 amountIn, uint256 amountOutMinimum, address token0, address token1, uint24 poolFee) external returns (uint256 amountOut) {

        // Safe Transfer Tokens
        TransferHelper.safeTransferFrom(token0, msg.sender, address(this), amountIn);
        // Approve the router to spend WBTC.
        TransferHelper.safeApprove(token0, address(swapRouter), amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: token0,
                tokenOut: token1,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }

}