const {
  createPublicClient,
  encodeFunctionData,
  http,
} = require('viem');
const abi = require("./abi.json");

const { createPimlicoPaymasterClient } = require('permissionless/clients/pimlico');

const { privateKeyToSafeSmartAccount } = require('permissionless/accounts');
const { bundlerActions, createSmartAccountClient } = require('permissionless');
const { pimlicoBundlerActions } = require('permissionless/actions/pimlico');
const { sepolia } = require('viem/chains');

const apiKey = process.env.PIMLICO_API_KEY;
const paymasterUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${apiKey}`;
const bundlerUrl = `https://api.pimlico.io/v1/sepolia/rpc?apikey=${apiKey}`;

async function main({ account, startTime, endTime, hash }) {
  const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
  const paymasterClient = createPimlicoPaymasterClient({
    transport: http(paymasterUrl),
  });

  const publicClient = createPublicClient({
    transport: http('https://rpc.ankr.com/eth_sepolia'),
    chain: sepolia,
  });

  const safeAccount = await privateKeyToSafeSmartAccount(publicClient, {
    privateKey: process.env.PRIVATE_KEY,
    safeVersion: '1.4.1',
    entryPoint, // global entrypoint
  });
  console.log(safeAccount.address);
  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    chain: sepolia,
    transport: http(bundlerUrl),
    sponsorUserOperation: paymasterClient.sponsorUserOperation,
  })
    .extend(bundlerActions)
    .extend(pimlicoBundlerActions);
  const callData = await safeAccount.encodeCallData({
    to: process.env.CONTRACT_ADDRESS,
    data: encodeFunctionData({
      abi: abi,
      functionName: 'mint',
      args: [
        account,
        startTime,
        endTime,
        hash,
        '0x00',
      ],
    }),
    value: BigInt(0),
  });

  const userOperation = await smartAccountClient.prepareUserOperationRequest({
    userOperation: {
      callData, // callData is the only required field in the partial user operation
    },
    account: safeAccount,
  });
  userOperation.signature =
    await safeAccount.signUserOperation(userOperation);
  const txnHash = await smartAccountClient.sendUserOperation({
    userOperation,
    entryPoint,
  });
  return { success: true, hash: txnHash };
}

module.exports = main;
