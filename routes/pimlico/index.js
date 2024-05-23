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
  const txnHash = await pimlico.signedMint({ signature, message, startTime, endTime, hash });
  console.log('signedMing got txnHash: ', txnHash);
  return { success: true, hash: txnHash };

}

module.exports = { mint, signedMint };
