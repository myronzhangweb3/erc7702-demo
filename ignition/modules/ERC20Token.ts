// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ERC20TokenModule = buildModule("ERC20TokenModule", (m) => {
  const name = "esMOZTest";
  const symbol = "esMOZTest";
  const ERC20Token = m.contract("ERC20Token", [name, symbol]);

  return { ERC20Token };
});

export default ERC20TokenModule;
