pragma solidity 0.8.10;

import {AaveFlashLoanV3, IPoolAddressesProvider} from './AaveFlashLoanV3.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';


import 'hardhat/console.sol';

contract AaveFlashLoanV3Factory {

    IPoolAddressesProvider public addressProvider;
    ISwapRouter public immutable uniSwapRouter;
    IUniswapV2Router02 public immutable sushiRouter;
    address[] public AaveFlashLoanV3Contracts;
    address public immutable owner;

    constructor(IPoolAddressesProvider _addressProvider, ISwapRouter _uniSwapRouter, IUniswapV2Router02 _sushiRouter){
        owner = address(msg.sender);
        addressProvider = _addressProvider;
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
        Creates a new flash loan and sets the owner to the person that
        called this function.
    */
    function createNewFlashLoanContract(uint256 paymentAmount) external payable returns (address){
        console.log(payable(msg.sender).balance);
        AaveFlashLoanV3 aaveContract = new AaveFlashLoanV3(addressProvider, address(msg.sender), uniSwapRouter, sushiRouter);
        AaveFlashLoanV3Contracts.push(address(aaveContract));
        return address(aaveContract);
    }
}