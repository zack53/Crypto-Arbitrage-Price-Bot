

# Crypto Arbitrage bot that will use UniSwap and SushiSwap to swap tokens.
The Arbitrage bot will be making use of Aave Flash Loan to maximize potential profits from the arbitrage opportunity.

## Starting out with a few popular pairs
    WETH -> WBTC
    WETH -> USDT
    WBTC -> USDT

## Current plans

I want to be able to use this Crypto Arbitrage Price Bot to identify arbitrage opportunities and call a flash loan using Aave V2 Flash Loan contracts. This flash loan contract will then borrow a token from a lender, make the transfer on one exchange to a different token i.e. from token0 to token1. Then, I will go to another exchange in the contract and transfer from token1 back to token0 before repaying the loan.

## Aave Flash Loan
The Solidity contract that will be responsible for this flash loan will require inputs of token0, token1, amountIn, amountOut, poolFee, deadline, and direction between UniSwap and SushiSwap. Currently looking at upgrading to AAVE v3 https://docs.aave.com/developers/guides/flash-loans before deploying to Polygon. The Flash Loan works dynamically with UniSwap and SushiSwap. The Arbitrage price bot will be able to send any token pair to the Flash Loan smart contract, granted they are supported on both UniSwap V3 and SushiSwap.

## How to set-up hardhat
https://hardhat.org/getting-started/

I am using hardhat to fork mainnet for testing swapping contracts. The hardhat also provides good documentation for automating testing and deployment, which I am using in this project.

## Uniswap API
Uniswaps V3 deployment addresses: https://docs.uniswap.org/protocol/reference/deployments .

The Uniswap V3 deployment address link above also has a link to current pool addresses https://info.uniswap.org/#/

A pool in Uniswap V3 is a pair. The WETH to WBTC pool can be found at the address https://etherscan.io/address/0x4585fe77225b41b697c938b018e2ac67ac5a20c0 and https://info.uniswap.org/#/pools/0x4585fe77225b41b697c938b018e2ac67ac5a20c0 .

The sqrtPrice96 calculation can be found https://docs.uniswap.org/sdk/guides/fetching-prices .

The TWAP price calculation, which is not implemented yet, can be found https://docs.uniswap.org/protocol/concepts/V3-overview/oracle .

When deriving a price, you should always take into account the decimals used on the ERC20 token. You can see how I took these token decimals into account in the code UniswapPriceCalculator.js file under the src directory within the uniswapGetSqrtPrice function. The decimals can be found at the ERC20 token address or of course dynamically with code.

A single swap guide can be found at the location https://docs.uniswap.org/protocol/guides/swaps/single-swaps.

## Sushi Swp API
The overal documentation for SushiSwap can be found https://docs.sushi.com/ . This is a good place to read about the services SushiSwap provides.

The development documentation can be found https://dev.sushi.com/ . The implementation to swaping single tokens on SushiSwap is the same as UniSwapV2 Router, but the addresses used for SushiSwap are different. The SushiSwap addresses can be found at the following location https://dev.sushi.com/sushiswap/contracts .
