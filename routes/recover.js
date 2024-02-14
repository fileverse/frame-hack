const { ethers } = require("ethers");

async function main({ message, signature }) {
  const data = await ethers.hashMessage(message);
  const address = await ethers.recoverAddress(data, signature);
  return { address };
}

module.exports = main;
