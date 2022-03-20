const { ethers } = require("hardhat");

async function main() {
  const SushiSwapSingleSwap = await ethers.getContractFactory('SushiSwapSingleSwap')
  const sushiSwapSingleSwap = await SushiSwapSingleSwap.deploy("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");

  // We get the contract to deploy
  const UniSwapSingleSwap = await ethers.getContractFactory("UniSwapSingleSwap");
  const uniSwapSingleSwap = await UniSwapSingleSwap.deploy("0xE592427A0AEce92De3Edee1F18E0157C05861564");

  console.log("UniSwapSingleSwap deployed to:", uniSwapSingleSwap.address);
  console.log("SushiSwapSingleSwap deployed to:", sushiSwapSingleSwap.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

