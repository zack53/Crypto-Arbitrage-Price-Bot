const { ethers, web3 } = require("hardhat");
const { AaveILendingPoolAddressesProviderv3, UniSwapV3RouterAddress, SushiSwapV2RouterAddress, ChainLinkMaticToUSDTAddress } = require('../EVMAddresses/evmAddresses')

async function main() {
  const accounts = await web3.eth.getAccounts()

  const AaveFlashLoanV3Factory =  await ethers.getContractFactory("AaveFlashLoanV3Factory")
  const aaveFlashLoanV3Factory = await AaveFlashLoanV3Factory.deploy(AaveILendingPoolAddressesProviderv3, UniSwapV3RouterAddress, SushiSwapV2RouterAddress, ChainLinkMaticToUSDTAddress)

  await aaveFlashLoanV3Factory.createNewFlashLoanContract()
  let flashLoanAddress = await aaveFlashLoanV3Factory.getFlashLoanContract(accounts[0])


  console.log("AaveFlashLoanV3Factory deployed to:", aaveFlashLoanV3Factory.address);
  console.log('AaveFlashLoanV3 deployed to:', flashLoanAddress)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

