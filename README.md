

# Starting to build a Flash Loan bot with these three exchanges Uniswap, Pancake Swap, and Sushi Swap.
    https://gadgets360.com/cryptocurrency/opinion/defi-decentralised-finance-exchange-dex-top-5-2645666

## Starting out with a few popular pairs
    WETH -> WBTC
    WETH -> USDT
    WBTC -> USDT

## Current plans

I want to be able to use this Crypto Arbitrage Price Bot to identify arbitrage opportunities and call a flash loan contract that still needs to be developed. This flash loan contract will then borrow a token from a lender, make the transfer on one exchange to a different token i.e. from token0 to token1. Then, I will go to another exchange in the contract and transfer from token1 back to token0 before repaying the loan.

The Solidity contract that will be responsible for this flash loan will require inputs of token0, token1 and the two exchanges to transfer between. Currently looking at using AAVE https://docs.aave.com/faq/flash-loans as the flash loan provider.

## How to set-up hardhat
https://hardhat.org/getting-started/

## Uniswap API
Uniswaps V3 deployment addresses: https://docs.uniswap.org/protocol/reference/deployments.

The Uniswap V3 deployment address link above also has a link to current pool addresses https://info.uniswap.org/#/

A pool in Uniswap V3 is a pair. The WETH to WBTC pool can be found at the address https://etherscan.io/address/0x4585fe77225b41b697c938b018e2ac67ac5a20c0 and https://info.uniswap.org/#/pools/0x4585fe77225b41b697c938b018e2ac67ac5a20c0.

The sqrtPrice96 calculation can be found https://docs.uniswap.org/sdk/guides/fetching-prices.

The TWAP price calculation, which is not implemented yet, can be found https://docs.uniswap.org/protocol/concepts/V3-overview/oracle.

When deriving a price, you should always take into account the decimals used on the ERC20 token. You can see how I took these token decimals into account in the code UniswapPriceCalculator.js file under the src directory within the uniswapGetSqrtPrice function. The decimals can be found at the ERC20 token address or of course dynamically with code.

A single swap guide can be found at the location https://docs.uniswap.org/protocol/guides/swaps/single-swaps.

## Sushi Swp API

## Pancake Swap API
