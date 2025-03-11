import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
dotenv.config();

(async () => {
  // set up client account
  const provider = new ethers.JsonRpcProvider(process.env["RPC_URL"]);
  const wallet = new ethers.Wallet(`0x${process.env["DEPLOY_PRIVATE_KEY"]}`, provider);

  // mint tokens
  const contractAddress = process.env["ERC20_TOKEN"]?.substring(2); // Read contract address from .env
  const contractAbi = [
    "function mint(address to, uint256 amount) external"
  ]; 
  const contract = new ethers.Contract(`0x${contractAddress}`, contractAbi, wallet);
  
  const recipientAddress = await new ethers.Wallet(`0x${process.env["TX_ACCOUNT_PRIVATE_KEY"]}`, provider).getAddress();
  const amount = ethers.parseEther('1000'); // Replace with the amount of tokens to mint

  const mintTx = await contract.mint(recipientAddress, amount);
  console.log(`mint 1000 Token to ${recipientAddress}, transaction hash: ${mintTx.hash}`);

})();
