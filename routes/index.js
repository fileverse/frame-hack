const express = require('express');
const router = express.Router();
const heartbit = require('./heartbit');
const recover = require('./recover');

router.get('/', function(req, res, next) {
  res.send('relayer service');
});


router.post('/', async function(req, res, next) {
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

router.post('/verify', async function(req, res, next) {
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

module.exports = router;
