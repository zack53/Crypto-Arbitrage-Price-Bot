

# Crypto Arbitrage bot that will use UniSwap and SushiSwap to swap tokens.
The Arbitrage bot will be making use of Aave Flash Loan V3 to maximize potential profits from an arbitrage opportunity between the UniSwap V3 exchange and SushiSwap V2 exchange. There is a Factory contract that can be used to deploy a unique contract linked to the caller of the function. The caller is linked as the owner, and, as the owner, the caller will be the only one to call the flash loan for the generated contract. The current price is set to $50 USD to generate a new flash loan contract. I set the dollar amount to a variable that can be changed by the person who deployed the factory contract. I have provided the source code, so users do not need to pay for a flash loan contract but donations are welcome.


## Current plans
I want to be able to use this Crypto Arbitrage Price Bot to identify arbitrage opportunities and call a flash loan using Aave V3 Flash Loan contracts. This flash loan contract will then borrow a token from a lender, make the transfer on one exchange to a different token i.e. from token0 to token1. Then, I will go to another exchange in the contract and transfer from token1 back to token0 before repaying the loan. The Solidity smart contracts have been tested and deployed. I am working on getting the Arbitrage identifier code to work better.

## First successful Flash Loan in production
The first successful Flash Loan in production can be found at the [this transaction](https://polygonscan.com/tx/0xb94b2e6abec1adad5a2bacf36168d6aabfb6c10ea89619f3af1d1d92006503c4)

## Deployed Contracts

| **Polygon Mainnet Address** | |
| ----------- | ----------- |
| **AaveFlashLoanV3Factory** | [0xae87e56a9dF1Baf99F77B7A75F6EFDFD03bc41e5](https://polygonscan.com/address/0xae87e56a9dF1Baf99F77B7A75F6EFDFD03bc41e5) |
| **AaveFlashLoanV3** | [0xe139Ee6abdE011384549342fc5a92D26674040A2](https://polygonscan.com/address/0xe139Ee6abdE011384549342fc5a92D26674040A2) |

### AaveFlashLoanV3Factory
| Write Functions | Functions that anyone can call on the contract |
| ----------- | ----------- |
| createNewFlashLoanContract | Allows caller to create a new Flash Loan contract and assigns the owner to the caller. The Flash Loan contract created from this function allows the caller to execute a flash loan and either go from UniSwap to SushiSwap or vice versa depending on the dirction the caller give. | 

| Read Functions | Functions that anyone can read on the contract |
| ----------- | ----------- |
| getFlashLoanContract | This allows for someone to pass in an address to get the flash loan deployment address linked the input. This is used in case the caller lost the contract address from the createNewFlashLoanContract function. The caller can input the address the caller used to create the contract and get the deployed Flash Loan location. |
| getMaticValueNeededForNewContract | The caller can call this to figure out the amount of matic value the caller need to send with the createNewFlashLoanContract function for the process to succeed. |
| getAmountOfFlashLoansCreated | The amount of created flash loan contracts via the createNewFlashLoanContract function |
| addressProvider | Address for the Aave Flash Loan Provider |
| getOwner | Address for the owner of the AaveFlashLoanV3Factory |
| sushiRouter | Address for the Sushi Router used |
| uniSwapRouter | Address for the UniSwap Router used |

### AaveFlashLoanV3

| Write Functions | Functions that owner can call on the contract |
| ----------- | ----------- |
| myFlashLoanCall | Requires token0, token1, direction: 1 for token0 -> token1 using UniSwap and token1 -> token0 using SushiSwap 0 for SushiSwap to UniSwap, poolFee (required for UniSwap), amountIn, amountOut, deadline (required for SushiSwap). Executing this function will call a flash loan for the amountIn and start a trade from token0 to token1 and then from token1 back to token0 using the other exchange depending on the direction. Leaving the amountOut as 0 will ensure a trade happens. The trade will fail if there isn't enough token0 left on the contract for the premium Aave charges + the loan amount to be withdrawn. Only the owner of the Flash Loan contract will be able to execute this function. |
| transferOwnership | Transfers ownership to the address provided during the call. Only the owner of the contract can call this function. |
| withdraw | Withdraws any matic token on the account. Only the owner of the contract can call this function. |
| withdrawERC20Token | Withdraws provided ERC20 token address if there is any on the contract. Only the owner of the contract can call this function. | 

| Read Functions | Functions that anyone can read on the contract |
| ----------- | ----------- |
| ADDRESSES_PROVIDER | The Aave contract address that provides the POOL address |
| POOL | The pool contract address that the flashLoan is called on |
| getOwner | The current Owner of the Flash Loan Contract |

# Useful Resources

## Aave Flash Loan
The Solidity contract that will be responsible for this flash loan will require inputs of token0, token1, amountIn, amountOut, poolFee, deadline, and direction between UniSwap and SushiSwap. Currently using AAVE v3 https://docs.aave.com/developers/guides/flash-loans on Polygon. The Flash Loan works dynamically with UniSwap and SushiSwap. The Arbitrage price bot will be able to send any token pair to the Flash Loan smart contract, granted they are supported on both UniSwap V3 and SushiSwap.

## How to set-up hardhat
https://hardhat.org/getting-started/

I am using hardhat to fork polygon mainnet for testing swapping contracts. The hardhat also provides good documentation for automating testing and deployment, which I am using in this project.

I was able to easily verify my smart contract on polygonscan by following the steps located [here at coinsbench](https://coinsbench.com/verify-smart-contract-on-polygonscan-using-hardhat-9b8331dbd888).

## UniSwap API
UniSwap's V3 deployment addresses: https://docs.uniswap.org/protocol/reference/deployments .

The UniSwap V3 deployment address link above also has a link to current pool addresses https://info.uniswap.org/#/

A pool in UniSwap V3 is a pair. The WETH to WBTC pool can be found at the address https://etherscan.io/address/0x4585fe77225b41b697c938b018e2ac67ac5a20c0 and https://info.uniswap.org/#/pools/0x4585fe77225b41b697c938b018e2ac67ac5a20c0 .

The sqrtPrice96 calculation can be found https://docs.uniswap.org/sdk/guides/fetching-prices .

The TWAP price calculation, which is not implemented yet in the UniswapPriceCalculator.js file, can be found https://docs.uniswap.org/protocol/concepts/V3-overview/oracle .

When deriving a price, the decimals used by the ERC20 token should always be accounted for. An example of how I took these token decimals into account can be seen in the code UniswapPriceCalculator.js file under the src directory within the uniswapGetSqrtPrice function. The decimals can be found at the ERC20 token address or of course dynamically with code.

A single swap guide can be found at the location https://docs.uniswap.org/protocol/guides/swaps/single-swaps.

## SushiSwap API
The overal documentation for SushiSwap can be found https://docs.sushi.com/ . This is a good place to read about the services SushiSwap provides.

The development documentation can be found https://dev.sushi.com/ . The implementation to swaping single tokens on SushiSwap is the same as UniSwapV2 Router, but the addresses used for SushiSwap are different. The SushiSwap addresses can be found at the following location https://dev.sushi.com/sushiswap/contracts .
