const PimlicoClass = require('./PimlicoClass');
const pimlico = new PimlicoClass({
  apiKey: process.env.PIMLICO_API_KEY,
  chain: process.env.NETWORK,
  rpcUrl: process.env.NETWORK_RPC_URL,
});

async function mint({ account, startTime, endTime, hash }) {
  const txnHash = await pimlico.mint({ account, startTime, endTime, hash });
  console.log('txnHash: ', txnHash);
  return { success: true, hash: txnHash };
}

async function signedMint({ signature, message, startTime, endTime, hash }) {
  const userOpHash = await pimlico.signedMint({ signature, message, startTime, endTime, hash });
  console.log('signedMint got userOpHash: ', userOpHash);
  return { success: true, hash: "", userOpHash };

}

async function getUserOperationReceipt({ hash }) {
  const receipt = await pimlico.getUserOperationReceipt({ hash });
  return {
    success: receipt?.success || false,
    receipt: receipt?.receipt || {},
    error: receipt ? "" : "receipt not generated",
  }
}

module.exports = { mint, signedMint, getUserOperationReceipt };
