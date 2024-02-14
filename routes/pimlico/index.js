const PimlicoClass = require('./PimlicoClass');
const pimlico = new PimlicoClass({
  apiKey: process.env.PIMLICO_API_KEY,
  chain: process.env.NETWORK,
  rpcUrl: process.env.NETWORK_RPC_URL,
});

async function main({ account, startTime, endTime, hash }) {
  const txnHash = await pimlico.mint({ account, startTime, endTime, hash });
  console.log('txnHash: ', txnHash);
  return { success: true, hash: txnHash };
}

module.exports = main;
