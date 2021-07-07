// This script scan for events associated to a contract address on the Binance Smart Chain
// Can easily be adapted to work on the Ethereum network

const Web3 = require('web3');
const ethers = require('ethers');

require('events').defaultMaxListeners = 70;

// mainnet
const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
const privateKey = "REPLACEME";

const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/'); // MAINNET
const wallet = new ethers.Wallet(privateKey)
const account2 = wallet.connect(provider);

const factory = new ethers.Contract(
    '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // Can be modified to any other contract address ; Here this is for the BEP20Ethereum
    [
        'event Transfer(address indexed from, address indexed to, uint256 value)',
        'event Approval(address indexed owner, address indexed spender, uint256 value)',
        'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',

    ],
    account2
);

factory.on('Transfer', async (from, to, value) => { // 170000000000000 <=> 170000 tokens
    console.log('transfer ' + from + ' ' + to + ' ' + value)
})

factory.on('Approval', async (owner, spender, value) => {
    console.log('approval ' + owner + ' ' + spender + ' ' + value)
})

factory.on('OwnershipTransferred', async (previousOwner, newOwner) => {
    console.log('approval ' + previousOwner + ' ' + newOwner + ' ' + value)
})
