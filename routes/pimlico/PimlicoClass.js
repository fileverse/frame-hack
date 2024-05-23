const { createPublicClient, encodeFunctionData, http } = require("viem");
const { toBytes, toHex } = require("viem");
const { generatePrivateKey } = require("viem/accounts");
const abi = require("./abi.json");

const { ethers } = require('ethers');

const {
  createPimlicoPaymasterClient,
  createPimlicoBundlerClient,
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
  switch (chain) {
    case supportedChains.SEPOLIA:
      return sepolia;
    case supportedChains.BASE:
      return base;
    default:
      return null;
  }
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

    this.bundlerClient = createPimlicoBundlerClient({
      transport: http(this.bundlerUrl),
    })

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
    const gasPrices = await this.bundlerClient.getUserOperationGasPrice();
    const userOperation =
      await this.smartAccountClient.prepareUserOperationRequest({
        userOperation: {
          callData, // callData is the only required field in the partial user operation
          nonce: toHex(toBytes(generatePrivateKey()).slice(0, 24), { size: 32 }),
          maxFeePerGas: gasPrices.fast.maxFeePerGas, // if using Pimlico
          maxPriorityFeePerGas: gasPrices.fast.maxPriorityFeePerGas, // if using Pimlico
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

  async getAccount({ signature, message }) {
    const data = ethers.hashMessage(message);
    const account = ethers.recoverAddress(data, signature);
    return account;
  }

  async signedMint({ signature, message, startTime, endTime, hash }) {
    const account = await this.getAccount({ signature, message });
    const userOpHash = this.mint({ account, startTime, endTime, hash });
    console.log('userOpHash genrated: ', userOpHash);
    return userOpHash;
  }
}

module.exports = Pimlico;
