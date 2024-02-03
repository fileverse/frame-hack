const ethers = require("ethers");
const abi = require("./abi.json");

const provider = new ethers.AlchemyProvider(
  process.env.NETWORK,
  process.env.ALCHEMY_API_KEY
);

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const signer = new ethers.NonceManager(wallet);

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);

async function main({ account, startTime, endTime, hash, data }) {
  const txn = await contract.mint(account, startTime, endTime, hash, data);
  return { hash: txn.hash, txn };
}

module.exports = main;
