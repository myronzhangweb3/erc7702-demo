import { createWalletClient, defineChain, encodeFunctionData, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { eip7702Actions } from 'viem/experimental'
import * as dotenv from 'dotenv';
import { BatchCallDelegationAbi } from './abi'; // Fixed casing issue
import { ethers } from 'ethers';
dotenv.config();

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env["RPC_URL"]);
  
  const txAccount = privateKeyToAccount(`0x${process.env["TX_ACCOUNT_PRIVATE_KEY"]}`)
  console.log(`txAccount address: ${txAccount.address}`);
  const txAccountWalletClient = createWalletClient({
    account: txAccount,
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
  console.log(`sponsor address: ${sponsor.address}`);
  const sponsorAccountWalletClient = createWalletClient({
    account: sponsor,
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

  const contractAddress = process.env["BATCH_CALL_DELEGATION_CONTRACT_ADDRESS"]?.substring(2);
  console.log(`batch call delegation contract address: 0x${contractAddress}`);
  const authorization = await sponsorAccountWalletClient.signAuthorization({
    contractAddress: `0x${contractAddress}`,
    sponsor,
  });

  // contract writes
  const contractWritesHash = await txAccountWalletClient.writeContract({
    account: sponsor,
    abi: BatchCallDelegationAbi,
    address: txAccountWalletClient.account.address,
    functionName: 'execute',
    args: [[
      {
        data: '0x',
        to: '0xcb98643b8786950F0461f3B0edf99D88F274574D',
        value: parseEther('0.0001'),
      }, {
        data: '0x',
        to: '0xf3bd3c09a1610528c393C124f449274cc47C7FC4',
        value: parseEther('0.0002'),
      }
    ]],
    authorizationList: [authorization],
  });
  console.log(`send native token tx hash: ${contractWritesHash}`);

})();
