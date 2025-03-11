import * as dotenv from 'dotenv';
import { type HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",
};

module.exports = {
  solidity: "0.8.28",
  networks: {
    rpc: {
      url: process.env["RPC_URL"],
      accounts: [process.env["DEPLOY_PRIVATE_KEY"]],
    },
  },
};

export default config;
