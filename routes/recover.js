const { ethers } = require("ethers");

async function main({ message, signature }) {
  const address = await ethers.recoverAddress(message, signature);
  return { address };
}

module.exports = main;
