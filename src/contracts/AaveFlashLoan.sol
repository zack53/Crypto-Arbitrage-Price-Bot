pragma solidity ^0.8.0;
pragma abicoder v2;

import { FlashLoanReceiverBase } from "./FlashLoanReceiverBase.sol";
import { ILendingPool, ILendingPoolAddressesProvider } from "./Interfaces.sol";
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

import "hardhat/console.sol";
/** 
    !!!
    Never keep funds permanently on your FlashLoanReceiverBase contract as they could be 
    exposed to a 'griefing' attack, where the stored funds are used by an attacker.
    !!!
 */
contract AaveFlashLoan is FlashLoanReceiverBase {
    ILendingPoolAddressesProvider public provider;
    address immutable lendingPoolAddr;
    address public immutable owner;
    ISwapRouter constant uniSwapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    IUniswapV2Router02 constant sushiRouter = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    // Intantiate lending pool addresses provider and get lending pool address
    constructor(ILendingPoolAddressesProvider _addressProvider) FlashLoanReceiverBase(_addressProvider) public {
        provider = _addressProvider;
        lendingPoolAddr = provider.getLendingPool();
        owner = address(msg.sender);
    }
    // Modifies functions to only be called by address that
    // deployed this contract.
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
    )
        external
        override
        returns (bool)
    {

        //
        // This contract now has the funds requested.
        // Your logic goes here.
        //

        callSwapMechanism(params);
        // At the end of your logic above, this contract owes
        // the flashloaned amounts + premiums.
        // Therefore ensure your contract has enough to repay
        // these amounts.
        
        // Approve the LendingPool contract allowance to *pull* the owed amount
        for (uint i = 0; i < assets.length; i++) {
            uint amountOwing = amounts[i] + premiums[i];
            TransferHelper.safeApprove(assets[i], address(LENDING_POOL), amountOwing);
        }
        //sendTokenAmount(assets[0]);
        return true;
    }
    
    function myFlashLoanCall(address token0, address token1, uint8 direction, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) public onlyOwner {
        address receiverAddress = address(this);

        address[] memory assets = new address[](1);
        assets[0] = token0;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amountIn;

        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);
        bytes memory params = abi.encode(token0, token1, direction, poolFee, amountIn, amountOut, deadline);
        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            modes,
            onBehalfOf,
            params,
            referralCode
        );
    }

    function callSwapMechanism(bytes calldata params) internal{
        (address token0, address token1, uint8 direction, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) = abi.decode(params, (address, address, uint8, uint24, uint256, uint256, uint256));

        bytes memory neededParams = abi.encode(token0, token1, poolFee, amountIn, amountOut, deadline);
        if(direction == 1){
            // Call order to go from UniSwap to SushiSwap
            uint256 uniSwapAmountOut = callUniswapSingleSwap(neededParams);
            callSushiSwapSingleSwapAfter(neededParams, uniSwapAmountOut);
        }else{
            // Call order to go from SushiSwap to UniSwap
            uint256[] memory sushiSwapAmountOut = callSushiSwapSingleSwap(neededParams);
            callUniswapSingleSwapAfter(neededParams, sushiSwapAmountOut[1]);
        }
    }

    function uniSwapExactInputSingle(uint256 amountIn, uint256 amountOutMinimum, address token0, address token1, uint24 poolFee) internal returns (uint256 amountOut) {
        // Approve the router to spend WBTC.
        TransferHelper.safeApprove(token0, address(uniSwapRouter), amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
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
    function callUniswapSingleSwap(bytes memory params) internal returns (uint256 uniSwapAmountOut){
        (address token0, address token1, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) = abi.decode(params, (address, address, uint24, uint256, uint256, uint256));
        uniSwapAmountOut = uniSwapExactInputSingle(amountIn, amountOut, token0, token1, poolFee);
    }

    //Implementing amountOut 0 for testing.
    //Need to ensure that the minimum amountOut is the amountIn.
    function callUniswapSingleSwapAfter(bytes memory params, uint256 currentAmount) internal {
        (address token0, address token1, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) = abi.decode(params, (address, address, uint24, uint256, uint256, uint256));
        uniSwapExactInputSingle(currentAmount, 0, token1, token0, poolFee);
    }

    function sushiSwapExactInputSingle(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        uint256 deadline
        ) internal returns (uint256[] memory amountOut) {

        // Approve the router to spend WBTC.
        TransferHelper.safeApprove(path[0], address(sushiRouter), amountIn);


        // The call to `exactInputSingle` executes the swap.
        amountOut = sushiRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, address(this), deadline);
    }
    function callSushiSwapSingleSwap(bytes memory params) internal returns (uint256[] memory sushiSwapAmountOut){
        (address token0, address token1, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) = abi.decode(params, (address, address, uint24, uint256, uint256, uint256));
        address[] memory path = new address[](2);
        path[0] = token0;
        path[1] = token1;
        sushiSwapAmountOut = sushiSwapExactInputSingle(amountIn, amountOut, path, deadline);
    }
    //Implementing amountOut 0 for testing.
    //Need to ensure that the minimum amountOut is the amountIn.
    function callSushiSwapSingleSwapAfter(bytes memory params, uint256 currentAmount) internal {
        (address token0, address token1, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) = abi.decode(params, (address, address, uint24, uint256, uint256, uint256));
        address[] memory path = new address[](2);
        path[0] = token1;
        path[1] = token0;
        sushiSwapExactInputSingle(currentAmount, 0, path, deadline);
    }
    //Function to withdraw any ERC20 token.
    function withdrawERC20Token(address token) external onlyOwner returns(uint256 currentAmount){
        currentAmount = IERC20(token).balanceOf(address(this));
        require(currentAmount > 0, 'Contract does not have ERC20 token.');
        TransferHelper.safeTransfer(token, owner, currentAmount);
    }
}