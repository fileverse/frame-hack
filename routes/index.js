const express = require('express');
const router = express.Router();
const heartbit = require('./heartbit');

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
  console.log(response);
  if (response.hash) {
    res.send(response.hash);
    await response.txn.wait().then((reciept) => {
      console.log('reciept.hash: ', reciept.hash);
      console.log('reciept.hash: ', reciept.blockHash);
      console.log('reciept.hash: ', reciept.blockNumber);
    });
  } else {
    res.send(response.message);
  }
});

module.exports = router;
