//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import {AaveFlashLoanV3, IPoolAddressesProvider} from './AaveFlashLoanV3.sol';
import {ISwapRouter} from '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import {IUniswapV2Router02} from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import './interfaces/IChainLinkOracle.sol';


import 'hardhat/console.sol';

contract AaveFlashLoanV3Factory {

    /** 
        Address variables needed to create new contract.
    */
    IPoolAddressesProvider public addressProvider;
    ISwapRouter public immutable uniSwapRouter;
    IUniswapV2Router02 public immutable sushiRouter;

    /**
        Chain link oracle variable to get
        latestAnswer()
    */
    IChainLinkOracle public immutable chainLinkOracle;

    /**
        Stores flash loan addresses in an array
    */
    mapping(address => address) AaveFlashLoanV3Mappings;
    uint256 mapSize;
    /**
        Owner information in a private variable
    */
    address immutable owner;
    uint256 usdAmount = 50;

    /**
        Constructor takes in values on creation to be used by the AaveFlashLoanV3 contract creation.
    */
    constructor(IPoolAddressesProvider _addressProvider, ISwapRouter _uniSwapRouter, IUniswapV2Router02 _sushiRouter, IChainLinkOracle _oracle){
        owner = address(msg.sender);
        addressProvider = _addressProvider;
        uniSwapRouter = _uniSwapRouter;
        sushiRouter = _sushiRouter;
        chainLinkOracle = _oracle;
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
        Function to be used by someone who wants to know current value needed to
        create a new Flash Loan contract.
    */
    function getMaticValueNeededForNewContract() view public returns(uint256 amountNeeded){
        uint256 latestAnswer = uint256(chainLinkOracle.latestAnswer());
        amountNeeded = ((usdAmount*10**18)/latestAnswer)*10**8;
    }

    /**
        Creates a new flash loan and sets the owner to the person that
        called this function. Requires at least $50 USD of matic value 
        to create the contract.
    */
    function createNewFlashLoanContract() public payable returns (address){
        // I will not try to take $50 USD if the owner of the factory is
        // calling for a Flash Loan contract to be created.
        if(address(msg.sender) != owner){
            // Convert to minimum of $50 USD in matic value
            uint256 minAmount = getMaticValueNeededForNewContract();
            // Check to ensure minimum value amount was sent
            require(msg.value >= minAmount, 'Need to send at least $50 USD worth of matic to purchase flash loan contract');
            // Send $50 worth to owner
            (bool success, ) =  owner.call{ value: minAmount }("");
            require(success, "Transfer failed.");
            // Refund extra amount sent if there is a balance on this account
            if(address(this).balance > 0){
                (bool successRefund, ) =  msg.sender.call{ value: msg.value-minAmount }("");
                require(successRefund, "Transfer failed.");
            }
        }
        // Create flash loan contract and adds it to AaveFlashLoanV3Mappings
        // so that users can retrieve their contract address if they have
        // forgoten the location by passing in the address they created 
        // the contract with.
        AaveFlashLoanV3 aaveContract = new AaveFlashLoanV3(addressProvider, address(msg.sender), uniSwapRouter, sushiRouter);
        AaveFlashLoanV3Mappings[address(msg.sender)] = address(aaveContract);
        mapSize++;
        return address(aaveContract);
    }

    /**
        Withdraw function to be used in case any funds are left on
        the contract.
    */
    function withdraw() external payable onlyOwner(){
        (bool success, ) =  owner.call{ value: address(this).balance }("");
        require(success, "Withdraw failed.");
    }

    /**
        Function to get owner information that keeps 
        the owner variable private.
    */
    function getOwner() view external returns (address){
        return address(owner);
    }

    /**
        Function to get Flash Loan contract for a specific
        creator address.
    */
    function getFlashLoanContract(address creatorAddress) view external returns(address flashLoanContractAddress){
        flashLoanContractAddress = AaveFlashLoanV3Mappings[creatorAddress];
    }

    /**
        Function to get current size of contracts created
        through the factory.
    */
    function getAmountOfFlashLoansCreated() view external returns(uint256 amountCreated){
        amountCreated = mapSize;
    }

    /**
        Function to change USD amount needed to create
        contract.
    */
    function changeUSDAmount(uint256 setAmount) external onlyOwner {
        usdAmount = setAmount;
    }
}