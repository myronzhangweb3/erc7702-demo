import { createWalletClient, defineChain, encodeAbiParameters, encodeFunctionData, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { eip7702Actions } from 'viem/experimental'
import * as dotenv from 'dotenv';
import { BatchCallDelegationAbi, ERC20Abi } from './ABI';
import { ethers } from 'ethers';
dotenv.config();

// ERC-7821 单批次执行模式常量
const BATCH_EXECUTION_MODE = '0x0100000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

// 将 Execution[] 编码为 ERC-7579 标准 executionData
function encodeBatchExecutionData(
  executions: { target: `0x${string}`; value: bigint; callData: `0x${string}` }[]
): `0x${string}` {
  return encodeAbiParameters(
    [{
      type: 'tuple[]',
      components: [
        { name: 'target', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'callData', type: 'bytes' },
      ],
    }],
    [executions],
  );
}

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
        default: { http: [process.env["RPC_URL"] || ''] },
      },
      testnet: true,
    }),
    transport: http(),
  }).extend(eip7702Actions())

  // txAccount 签署授权，将自身代码委托给 BatchCallDelegation
  const contractAddress = process.env["BATCH_CALL_DELEGATION_CONTRACT_ADDRESS"] as `0x${string}`;
  console.log(`batch call delegation contract address: ${contractAddress}`);
  const authorization = await txAccountWalletClient.signAuthorization({
    contractAddress,
  });
  console.log(`authorization: ${JSON.stringify(authorization)}`);

  const erc20ContractAddress = process.env["ERC20_TOKEN_ADDRESS"] as `0x${string}`;
  console.log(`erc20ContractAddress: ${erc20ContractAddress}`);

  // 构建 ERC-7579 格式的批量执行数据
  const executionData = encodeBatchExecutionData([
    {
      target: erc20ContractAddress,
      value: 0n,
      callData: encodeFunctionData({
        abi: ERC20Abi,
        functionName: 'transfer',
        args: ['0xf3bd3c09a1610528c393C124f449274cc47C7FC4', parseEther('0.1')],
      }),
    },
    {
      target: erc20ContractAddress,
      value: 0n,
      callData: encodeFunctionData({
        abi: ERC20Abi,
        functionName: 'transfer',
        args: ['0xf3bd3c09a1610528c393C124f449274cc47C7FC4', parseEther('0.2')],
      }),
    },
  ]);

  // txAccount 调用自身地址（已委托为 BatchCallDelegation），执行批量转账
  const contractWritesHash = await txAccountWalletClient.writeContract({
    account: txAccount,
    abi: BatchCallDelegationAbi,
    address: txAccount.address,
    functionName: 'execute',
    args: [BATCH_EXECUTION_MODE, executionData],
    authorizationList: [authorization],
  });
  console.log(`send erc20 tx hash: ${contractWritesHash}`);

})();
