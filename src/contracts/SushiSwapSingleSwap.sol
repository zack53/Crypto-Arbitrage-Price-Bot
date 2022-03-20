// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;
pragma abicoder v2;

import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

contract SushiSwapSingleSwap { 

    IUniswapV2Router02 public immutable sushiRouter;

    constructor(IUniswapV2Router02 _sushiRouter) {
        sushiRouter = _sushiRouter;
    }


    function swapExactInputSingle(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
        ) external returns (uint256[] memory amountOut) {

        // Safe Transfer Tokens
        TransferHelper.safeTransferFrom(path[0], msg.sender, address(this), amountIn);
        // Approve the router to spend WBTC.
        TransferHelper.safeApprove(path[0], address(sushiRouter), amountIn);


        // The call to `exactInputSingle` executes the swap.
        amountOut = sushiRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
    }

}