import { createWalletClient, defineChain, encodeFunctionData, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { eip7702Actions } from 'viem/experimental'
import * as dotenv from 'dotenv';
import { BatchCallDelegationAbi, ERC20Abi } from './abi';
import { ethers } from 'ethers';
dotenv.config();

(async () => {
  // set up client account
  const account = privateKeyToAccount(`0x${process.env["TX_ACCOUNT_PRIVATE_KEY"]}`)

  const provider = new ethers.JsonRpcProvider(process.env["RPC_URL"]);
  const walletClient = createWalletClient({
    account,
    chain: defineChain({
      id: Number((await provider.getNetwork()).chainId),
      name: 'Custom Chain',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: {
          http: [process.env["RPC_URL"] || ''],
        },
      },
      testnet: true,
    }),
    transport: http(),
  }).extend(eip7702Actions())

  // authorize contract designation
  const sponsor = privateKeyToAccount(`0x${process.env["SPONSOR_PRIVATE_KEY"]}`);
  const contractAddress = process.env["BATCH_CALL_DELEGATION_CONTRACT_ADDRESS"]?.substring(2);
  const authorization = await walletClient.signAuthorization({
    contractAddress: `0x${contractAddress}`,
    sponsor,
  });

  const erc20ContractAddress = process.env["ERC20_TOKEN_ADDRESS"]?.substring(2);
  // contract writes
  const contractWritesHash = await walletClient.writeContract({
    account: sponsor,
    abi: BatchCallDelegationAbi,
    address: walletClient.account.address,
    functionName: 'execute',
    args: [[
      {
        data: encodeFunctionData({
          abi: ERC20Abi,
          functionName: 'transfer',
          args: ['0xf3bd3c09a1610528c393C124f449274cc47C7FC4', parseEther('0.1')],
        }),
        to: `0x${erc20ContractAddress}`,
        value: parseEther('0'),
      }, {
        data: encodeFunctionData({
          abi: ERC20Abi,
          functionName: 'transfer',
          args: ['0xf3bd3c09a1610528c393C124f449274cc47C7FC4', parseEther('0.2')],
        }),
        to: `0x${erc20ContractAddress}`,
        value: parseEther('0'),
      }
    ]],
    authorizationList: [authorization],
  });
  console.log(`send erc20 tx hash: ${contractWritesHash}`);

})();
