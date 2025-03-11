import { createWalletClient, encodeFunctionData, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { eip7702Actions } from 'viem/experimental'
import * as dotenv from 'dotenv';
import { BatchCallDelegationAbi } from './abi'; // Fixed casing issue
dotenv.config();

(async () => {
  // set up client account
  const account = privateKeyToAccount(`0x${process.env["TX_ACCOUNT_PRIVATE_KEY"]}`)

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  }).extend(eip7702Actions())


  // authorize contract designation
  const sponsor = privateKeyToAccount(`0x${process.env["SPONSOR_PRIVATE_KEY"]}`);
  const contractAddress = process.env["BATCH_CALL_DELEGATION_CONTRACT_ADDRESS"]?.substring(2);
  const authorization = await walletClient.signAuthorization({
    contractAddress: `0x${contractAddress}`,
    sponsor,
  });

  // contract writes
  const contractWritesHash = await walletClient.writeContract({
    account: sponsor,
    abi: BatchCallDelegationAbi,
    address: walletClient.account.address,
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
