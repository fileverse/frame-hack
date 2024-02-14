const { createPublicClient, encodeFunctionData, http, getAddress } = require("viem");
const abi = require("./abi.json");

const {
  createPimlicoPaymasterClient,
} = require("permissionless/clients/pimlico");

const { privateKeyToSafeSmartAccount } = require("permissionless/accounts");
const {
  bundlerActions,
  createSmartAccountClient,
  getAccountNonce,
} = require("permissionless");
const { pimlicoBundlerActions } = require("permissionless/actions/pimlico");
const { sepolia, base } = require("viem/chains");

const supportedChains = {
  SEPOLIA: "sepolia",
  BASE: "base",
};

function resolveViemChainInstance(chain) {
  if (chain === supportedChains.SEPOLIA) {
    return sepolia;
  }
  if (chain === supportedChains.BASE) {
    return base;
  }
  return null;
}

class Pimlico {
  constructor({ apiKey, chain, rpcUrl }) {
    this.name = "Pimlico";
    this.entryPoint = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
    this.rpcUrl = rpcUrl;
    this.hasAgent = false;
    this.chain = resolveViemChainInstance(chain);
    if (!this.chain) {
      throw new Error("unsupported chains: should be either base or sepolia");
    }
    this.paymasterUrl = `https://api.pimlico.io/v2/${chain}/rpc?apikey=${apiKey}`;
    this.bundlerUrl = `https://api.pimlico.io/v1/${chain}/rpc?apikey=${apiKey}`;
  }
  async setup() {
    this.hasAgent = true;
    this.key = 0;
    this.paymasterClient = createPimlicoPaymasterClient({
      transport: http(this.paymasterUrl),
    });

    this.publicClient = createPublicClient({
      transport: http(this.rpcUrl),
      chain: this.chain,
    });
    this.safeAccount = await privateKeyToSafeSmartAccount(this.publicClient, {
      privateKey: process.env.PRIVATE_KEY,
      safeVersion: "1.4.1",
      entryPoint: this.entryPoint, // global entrypoint
      address: process.env.PIMLICO_ADDRESS,
    });
    this.nonce = await getAccountNonce(this.publicClient, { sender: this.safeAccount.address, entryPoint: this.entryPoint });
    this.smartAccountClient = createSmartAccountClient({
        account: this.safeAccount,
        chain: sepolia,
        transport: http(this.bundlerUrl),
        sponsorUserOperation: this.paymasterClient.sponsorUserOperation,
      })
        .extend(bundlerActions)
        .extend(pimlicoBundlerActions);
  }

  async getCallData({ account, startTime, endTime, hash }) {
    const callData = await this.safeAccount.encodeCallData({
      to: process.env.CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: abi,
        functionName: "mint",
        args: [account, startTime, endTime, hash, "0x00"],
      }),
      value: BigInt(0),
    });
    return callData;
  }

  async waitForUserOperationReceipt({ txnHash }) {
    console.log('waitForUserOperationReceipt :', txnHash);
    return await this.smartAccountClient.waitForUserOperationReceipt({ hash: txnHash });
  }

  async mint({ account, startTime, endTime, hash }) {
    if (this.hasAgent === false) {
      await this.setup();
    }
    const callData = await this.getCallData({
      account,
      startTime,
      endTime,
      hash,
    });
    const userOperation =
      await this.smartAccountClient.prepareUserOperationRequest({
        userOperation: {
          callData, // callData is the only required field in the partial user operation
          nonce: this.nonce++,
        },
        account: this.safeAccount,
      });
    userOperation.signature = await this.safeAccount.signUserOperation(
      userOperation
    );
    const txnHash = await this.smartAccountClient.sendUserOperation({
      userOperation,
      entryPoint: this.entryPoint,
    });
    this.waitForUserOperationReceipt({ txnHash }).then(console.log);
    return txnHash;
  }
}

module.exports = Pimlico;
