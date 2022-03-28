// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import { FlashLoanReceiverBase, IFlashLoanReceiver, IPoolAddressesProvider, IPool } from './base/FlashLoanReceiverBase.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

/**
 * @title IFlashLoanReceiver
 * @author Aave
 * @notice Defines the basic interface of a flashloan-receiver contract.
 * @dev Implement this interface to develop a flashloan-compatible flashLoanReceiver contract
 **/
contract AaveFlashLoanV3 is FlashLoanReceiverBase{
    
    
    address public owner;
    ISwapRouter immutable uniSwapRouter;
    IUniswapV2Router02 immutable sushiRouter;

    /**
        Intantiate lending pool addresses provider and get lending pool address
    */
    constructor(IPoolAddressesProvider _addressProvider, address _owner, ISwapRouter _uniSwapRouter, IUniswapV2Router02 _sushiRouter) FlashLoanReceiverBase(_addressProvider) public {
        owner = _owner;
        uniSwapRouter = _uniSwapRouter;
        sushiRouter = _sushiRouter;
    }


     /** 
        Modifies functions to only be called by address that
        deployed this contract.
    */
    modifier onlyOwner{
        require(address(msg.sender) == owner);
        _;
    }  
    /**
        This function is called after your contract has received the flash loaned amount
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
        ) external override returns (bool){

        // This contract now has the funds requested.
        // Call function to swap tokens.
        swapERC20Tokens(params);

        // At the end of your logic above, this contract owes
        // the flashloaned amounts + premiums.
        // Therefore ensure your contract has enough to repay
        // these amounts.
        
        // Approve the LendingPool contract allowance to *pull* the owed amount
        for (uint i = 0; i < assets.length; i++) {
            uint amountOwing = amounts[i] + premiums[i];
            TransferHelper.safeApprove(assets[i], address(POOL), amountOwing);
        }
        
        return true;
    }
    /**
        This is the function that starts the flash loan.
     */
    function myFlashLoanCall(address token0, address token1, uint8 direction, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) public onlyOwner {
        //Building information needed for flash loan
        address receiverAddress = address(this);

        address[] memory assets = new address[](1);
        assets[0] = token0;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amountIn;

        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;
        address onBehalfOf = address(this);
        // I am encoding parameters needed for other functions that are called in the
        // executeOperation call back function.
        bytes memory params = abi.encode(token0, token1, direction, poolFee, amountIn, amountOut, deadline);
        uint16 referralCode = 0;
        //Sends information for the flashLoan
        POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            modes,
            onBehalfOf,
            params,
            referralCode
        );
    }
    /**
        Swapping mechanism that handles directional logic.
    */
    function swapERC20Tokens(bytes calldata params) internal{
        (address token0, address token1, uint8 direction, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) = abi.decode(params, (address, address, uint8, uint24, uint256, uint256, uint256));

        address[] memory path = new address[](2);
        // I set the reverse
        if(direction == 1){
            // Call order to go from UniSwap to SushiSwap
            uint256 uniSwapAmountOut = uniSwapExactInputSingle(amountIn, amountOut, token0, token1, poolFee);  
            // Reverse direction to trade back to original token 
            path[0] = token1;
            path[1] = token0;
            sushiSwapExactInputSingle(uniSwapAmountOut, 0, path, deadline);
        }else{
            // Call order to go from SushiSwap to UniSwap
            path[0] = token0;
            path[1] = token1;
            uint256[] memory sushiSwapAmountOut = sushiSwapExactInputSingle(amountIn, amountOut, path, deadline);  
            // Reverse direction to trade back to original token 
            uniSwapExactInputSingle(sushiSwapAmountOut[1], 0, token1, token0, poolFee);
        }
    }
    /**
        Base function to use UniSwap V3 Swap Router
    */
    function uniSwapExactInputSingle(uint256 amountIn, uint256 amountOutMinimum, address token0, address token1, uint24 poolFee) internal returns (uint256 amountOut) {
        // Approve the router to spend current token0.
        TransferHelper.safeApprove(token0, address(uniSwapRouter), amountIn);

        // We set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: token0,
                tokenOut: token1,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = uniSwapRouter.exactInputSingle(params);
    }
    /**
        Base function to use SushiSwap Router
    */
    function sushiSwapExactInputSingle(uint256 amountIn, uint256 amountOutMin, address[] memory path, uint256 deadline) internal returns (uint256[] memory amountOut) {

        // Approve the router to spend WBTC.
        TransferHelper.safeApprove(path[0], address(sushiRouter), amountIn);


        // The call to `exactInputSingle` executes the swap.
        amountOut = sushiRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, address(this), deadline);
    }
    /**
        TODO: create function to transfer ETH
        
        // withdraw all ETH
        msg.sender.call{ value: address(this).balance }("");
    */

    
    /**
        Withdraw provided ERC20 token.
    */
    function withdrawERC20Token(address token) external onlyOwner returns(uint256 currentAmount){
        currentAmount = IERC20(token).balanceOf(address(this));
        require(currentAmount > 0, 'Contract does not have the provided ERC20 token.');
        TransferHelper.safeTransfer(token, owner, currentAmount);
    }
    /**
        Change the owner of the contract.
     */
     function transferOwnership(address newOwner) external onlyOwner {
         owner = newOwner;
     }
}