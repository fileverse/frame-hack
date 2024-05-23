const express = require('express');
const router = express.Router();
const heartbit = require('./heartbit');
const recover = require('./recover');
const auth = require('../middleware/auth');
const PIMLICO = require('./pimlico');

router.get('/', function (req, res, next) {
  res.send('relayer service');
});


router.post('/', auth, async function (req, res, next) {
  const { account, startTime, endTime } = req.body;
  const response = await heartbit({
    account,
    startTime,
    endTime,
    hash: 'ipfs://QmURaqcRxLpuFkyhvsCBQPfpsC7Vruj7jhPXqYGpsp9QUE',
    data: '0x00',
  }).catch((error) => {
    console.log(error);
    return { success: false, message: 'txn failed' };
  });
  if (response.hash) {
    res.send({ success: true, txnHash: response.hash });
    await response.txn.wait().then((reciept) => {
      console.log('reciept.hash: ', reciept.hash);
      console.log('reciept.blockHash: ', reciept.blockHash);
      console.log('reciept.blockNumber: ', reciept.blockNumber);
    });
  } else {
    res.send({ success: false, message: response.message });
  }
});

router.post('/verify', async function (req, res, next) {
  const { message, signature, startTime, endTime, hash } = req.body;
  const { address } = await recover({ message, signature })
  const response = await heartbit({
    account: address,
    startTime,
    endTime,
    hash,
    data: '0x00',
  }).catch((error) => {
    console.log(error);
    return { success: false, message: 'txn failed' };
  });
  console.log(response);
  if (response.hash) {
    res.send({ success: true, txnHash: response.hash });
    await response.txn.wait().then((reciept) => {
      console.log('reciept.hash: ', reciept.hash);
      console.log('reciept.blockHash: ', reciept.blockHash);
      console.log('reciept.blockNumber: ', reciept.blockNumber);
    });
  } else {
    res.send({ success: false, message: response.message });
  }
});

router.post('/address-mint', async function (req, res, next) {
  const { account, startTime, endTime, hash } = req.body;
  const response = await PIMLICO.mint({
    account,
    startTime,
    endTime,
    hash,
    data: '0x00',
  }).catch((error) => {
    console.log(error);
    return { success: false, message: 'txn failed' };
  });
  if (response.hash) {
    res.send({ success: true, txnHash: response.hash });
  } else {
    res.send({ success: false, message: response.message });
  }
});

router.post('/signed-mint', async function (req, res) {
  const { message, signature, startTime, endTime, hash } = req.body;

  const response = await PIMLICO.signedMint({
    message,
    signature,
    startTime,
    endTime,
    hash,
    data: '0x00',
  }).catch((error) => {
    console.log(error);
    return { success: false, message: 'txn failed' };
  });
  if (response.success) {
    res.send({ success: true, txnHash: response.hash, userOpHash: response.userOpHash });
  } else {
    res.send({ success: false, message: response.message });
  }
});


module.exports = router;
