const Web3 = require('web3');
const ethers = require('ethers');

require('events').defaultMaxListeners = 70; // Not sure if this is needed

// mainnet
const web3 = new Web3('https://bsc-dataseed1.binance.org:443');

// Iterate over (current block - 500000) to (current block)
let index = 0
web3.eth.getBlockNumber().then(blockNumber => {
    for (let i = blockNumber - 500000; i <= blockNumber; i++) { // 500000 <=> Back do approximatively 17 days
        setTimeout(function(index) {
            getBlockInfo(i).then()
        }, 2500 * index, index) // Change 2500 to a suitable value (the server sends a 403 forbidden error if you make too many requests in a unknown(?) interval)
        index = index+1
    }
}).catch(err => {
    if (err.contains('<title>403 Forbidden</title>')) {
        console.log('It seems that you have made too many requests. Please wait some minutes and launch this script again.')
        process.exit(-1)
    } else {
        console.log(err)
    }
});

// Address list of addresses to scan transactions for
let addressList = [];
addressList.push('0xa00167200000000712750266FAC5d66e00000000'.toLowerCase())
addressList.push('0x30071c6000000005891C4b40498Fae5400000000'.toLowerCase())
addressList.push('0x900CfF5000000003f18816Cb4997B05600000000'.toLowerCase())
addressList.push('0x7002E5a0000000038B6C50ee7c8Dee7600000000'.toLowerCase())

async function getBlockInfo(i) {
    await web3.eth.getBlock(i).then(block => {
        block.transactions.forEach(function (t) {
            web3.eth.getTransaction(t).then(transaction => {
                let from = transaction.from.toLowerCase()
                let to = transaction.to.toLowerCase()
                if (addressList.contains(from) || addressList.contains(to)) {
                    console.log(i + ' ' + transaction.hash + ' ' + transaction.from + ' ' + transaction.to + ' ' + transaction.value)
                }
            }).catch((error) => {
                //console.log('Error tx ' + t)
                //process.exit(-1)
            })
        })
    }).catch((error) => {console.log(error)})
}

