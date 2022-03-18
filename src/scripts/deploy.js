async function main() {
  // We get the contract to deploy
  const Greeter = await ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy("Hello, Hardhat!");


  // We get the contract to deploy
  const UniSwapSingleSwap = await ethers.getContractFactory("UniSwapSingleSwap");
  const uniSwapSingleSwap = await UniSwapSingleSwap.deploy("0xE592427A0AEce92De3Edee1F18E0157C05861564");

  console.log("Greeter deployed to:", greeter.address);

  console.log("UniSwapSingleSwap deployed to:", uniSwapSingleSwap.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

