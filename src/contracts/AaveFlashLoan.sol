pragma solidity ^0.8.0;
pragma abicoder v2;

import { FlashLoanReceiverBase } from "./FlashLoanReceiverBase.sol";
import { ILendingPool, ILendingPoolAddressesProvider } from "./Interfaces.sol";
import "./UniSwapSingleSwap.sol";
import "./SushiSwapSingleSwap.sol";

import "hardhat/console.sol";
/** 
    !!!
    Never keep funds permanently on your FlashLoanReceiverBase contract as they could be 
    exposed to a 'griefing' attack, where the stored funds are used by an attacker.
    !!!
 */
contract AaveFlashLoan is FlashLoanReceiverBase {
    ILendingPoolAddressesProvider public provider;
    address lendingPoolAddr;

    UniSwapSingleSwap uniSwapSingleSwap = new UniSwapSingleSwap(ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564));
    SushiSwapSingleSwap sushiSwapSingleSwap = new SushiSwapSingleSwap(IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D));

    // intantiate lending pool addresses provider and get lending pool address
    constructor(ILendingPoolAddressesProvider _addressProvider) FlashLoanReceiverBase(_addressProvider) public {
        provider = _addressProvider;
        lendingPoolAddr = provider.getLendingPool();
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
        
        return true;
    }
    
    function myFlashLoanCall(address token0, address token1, uint8 direction, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) public {
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
            console.log(sushiSwapAmountOut[1]);
            callUniswapSingleSwapAfter(neededParams, sushiSwapAmountOut[1]);
        }
    }

    function callUniswapSingleSwap(bytes memory params) internal returns (uint256 uniSwapAmountOut){
        (address token0, address token1, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) = abi.decode(params, (address, address, uint24, uint256, uint256, uint256));

        TransferHelper.safeApprove(token0, address(uniSwapSingleSwap), amountIn);
        uniSwapAmountOut = uniSwapSingleSwap.swapExactInputSingle(amountIn, amountOut, token0, token1, poolFee);
        console.log('Inside UniSwap Single Swap Call');
        console.log(uniSwapAmountOut);
    }

    //Implementing amountOut 0 for testing.
    //Need to ensure that the minimum amountOut is the amountIn.
    function callUniswapSingleSwapAfter(bytes memory params, uint256 currentAmount) internal {
        (address token0, address token1, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) = abi.decode(params, (address, address, uint24, uint256, uint256, uint256));
        TransferHelper.safeApprove(token1, address(uniSwapSingleSwap), currentAmount);
        uniSwapSingleSwap.swapExactInputSingle(currentAmount, 0, token1, token0, poolFee);
    }

    function callSushiSwapSingleSwap(bytes memory params) internal returns (uint256[] memory sushiSwapAmountOut){
        (address token0, address token1, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) = abi.decode(params, (address, address, uint24, uint256, uint256, uint256));
        TransferHelper.safeApprove(token0, address(sushiSwapSingleSwap), amountIn);
        address[] memory path = new address[](2);
        path[0] = token0;
        path[1] = token1;
        sushiSwapAmountOut = sushiSwapSingleSwap.swapExactInputSingle(amountIn, amountOut, path, address(this), deadline);
    }

    //Implementing amountOut 0 for testing.
    //Need to ensure that the minimum amountOut is the amountIn.
    function callSushiSwapSingleSwapAfter(bytes memory params, uint256 currentAmount) internal {
        (address token0, address token1, uint24 poolFee, uint256 amountIn, uint256 amountOut, uint256 deadline) = abi.decode(params, (address, address, uint24, uint256, uint256, uint256));
        TransferHelper.safeApprove(token1, address(sushiSwapSingleSwap), currentAmount);
        address[] memory path = new address[](2);
        path[0] = token1;
        path[1] = token0;
        console.log(currentAmount);
        sushiSwapSingleSwap.swapExactInputSingle(currentAmount, 0, path, address(this), deadline);
    }
}