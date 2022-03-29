const { ethers, web3 } = require("hardhat");
const { AaveILendingPoolAddressesProviderv3, UniSwapV3RouterAddress, SushiSwapV2RouterAddress, ChainLinkMaticToUSDTAddress } = require('../EVMAddresses/evmAddresses')

async function main() {
  const accounts = await web3.eth.getAccounts()

  const AaveFlashLoanV3Factory =  await ethers.getContractFactory("AaveFlashLoanV3Factory")
  const aaveFlashLoanV3Factory = await AaveFlashLoanV3Factory.deploy(AaveILendingPoolAddressesProviderv3, UniSwapV3RouterAddress, SushiSwapV2RouterAddress, ChainLinkMaticToUSDTAddress)

  await aaveFlashLoanV3Factory.createNewFlashLoanContract()
  let flashLoanAddress = await aaveFlashLoanV3Factory.getFlashLoanContract(accounts[0])
  // const AaveFlashLoan = await ethers.getContractFactory('AaveFlashLoan')
  // const aaveFlashLoan = await AaveFlashLoan.deploy(AaveILendingPoolAddressesProviderv3);
  
  // const UniSwapSingleSwap = await ethers.getContractFactory("UniSwapSingleSwap");
  // const uniSwapSingleSwap = await UniSwapSingleSwap.deploy(UniSwapV3RouterAddress);

  
  // const SushiSwapSingleSwap = await ethers.getContractFactory('SushiSwapSingleSwap')
  // const sushiSwapSingleSwap = await SushiSwapSingleSwap.deploy(SushiSwapV2RouterAddress);


  console.log("AaveFlashLoanV3Factory deployed to:", aaveFlashLoanV3Factory.address);
  console.log('AaveFlashLoanV3 deployed to:', flashLoanAddress)
  // console.log("AaveFlashLoan deployed to:", aaveFlashLoan.address);
  // console.log("UniSwapSingleSwap deployed to:", uniSwapSingleSwap.address);
  // console.log("SushiSwapSingleSwap deployed to:", sushiSwapSingleSwap.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

