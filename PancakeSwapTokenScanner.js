const Web3 = require('web3');
const ethers = require('ethers');

require('events').defaultMaxListeners = 70;

// mainnet
const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
// testnet
//const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

const privateKey = "REPLACE BY YOUR PRIVATE KEY HERE";

// Récupération compte par clé privée
const account = web3.eth.accounts.privateKeyToAccount(privateKey)

const addresses = {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    factory: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
    router: '0x10ed43c718714eb63d5aa57b78b54704e256024e',
    recipient: account.address
};

const mnemonic = privateKey;
//const provider = new ethers.providers.WebSocketProvider('wss://bsc-ws-node.nariox.org:443');
const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/'); // MAINNET
const wallet = new ethers.Wallet(mnemonic);
const account2 = wallet.connect(provider);

const factory = new ethers.Contract(
    addresses.factory,
    [
        'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
        'function getPair(address tokenA, address tokenB) external view returns (address pair)'
    ],
    account2
);

const dictTokenAddressToTokenName = {};
const dictPairAddressToTokensPairName = {};

console.log('BOT STARTED');

factory.on('PairCreated', async (token0, token1, pairAddress) => {

    await getContractName(token0).then(result => {
        //console.log('token0Name = ' + result)
        if (result.trim() !== '') {
            dictTokenAddressToTokenName[token0] = result
        }
        else {
            dictPairAddressToTokensPairName[token0] = token0
        }
    })

    await getContractName(token1).then(result => {
        //console.log('token1Name = ' + result)
        if (result.trim() !== '') {
            dictTokenAddressToTokenName[token1] = result
        }
        else {
            dictPairAddressToTokensPairName[token1] = token1
        }
    })

    console.log(getNow() + "New BSC Token Pair : [" + dictTokenAddressToTokenName[token0] + " / " + dictTokenAddressToTokenName[token1] + '] ; pairAddress = ' + pairAddress)
    dictPairAddressToTokensPairName[pairAddress] = dictTokenAddressToTokenName[token0] + ' / ' + dictTokenAddressToTokenName[token1]

    const pair = new ethers.Contract(pairAddress, ['event Mint(address indexed sender, uint amount0, uint amount1)'], account2);
    pair.on('Mint', async (sender, amount0, amount1) => {
        if (sender.toLowerCase() === addresses.router.toLowerCase()) sender = 'PancakeRouter'
        if (sender.toLowerCase() === addresses.factory.toLowerCase()) sender = 'PancakeFactory'
        console.log(getNow() + 'pairAddress = [' + dictPairAddressToTokensPairName[pairAddress] + '] : MINT ; sender = [' + sender + '] amount0 = [' + amount0 + '] amount1 = [' + amount1 + ']')
    })

    const pair2 = new ethers.Contract(pairAddress, ['event Approval(address indexed owner, address indexed spender, uint value)'], account2);
    pair2.on('Approval', async (owner, spender, value) => {
        if (owner.toLowerCase() === addresses.router.toLowerCase()) owner = 'PancakeRouter'
        if (owner.toLowerCase() === addresses.factory.toLowerCase()) owner = 'PancakeFactory'
        if (spender.toLowerCase() === addresses.router.toLowerCase()) spender = 'PancakeRouter'
        if (spender.toLowerCase() === addresses.factory.toLowerCase()) spender = 'PancakeFactory'
        //console.log(getNow() + "pairAddress = " + pairAddress + " : approval ; owner = " + owner + " spender = " + spender + " value = " + value)
        console.log(getNow() + 'pairAddress = [' + dictPairAddressToTokensPairName[pairAddress] + '] : APPROVAL ; owner = [' + owner + '] spender = [' + spender + '] value = [' + value + ']')
    })

    const pair3 = new ethers.Contract(pairAddress, ['event Transfer(address indexed from, address indexed to, uint value)'], account2);
    pair3.on('Transfer', async (from, to, value) => {
        if (from.toLowerCase() === addresses.router.toLowerCase()) from = 'PancakeRouter'
        if (from.toLowerCase() === addresses.factory.toLowerCase()) from = 'PancakeFactory'
        if (to.toLowerCase() === addresses.router.toLowerCase()) to = 'PancakeRouter'
        if (to.toLowerCase() === addresses.factory.toLowerCase()) to = 'PancakeFactory'
        //console.log(getNow() + "pairAddress = " + pairAddress + " : transfer ; from = " + from + " to = " + to + " value = " + value)
        console.log(getNow() + 'pairAddress = [' + dictPairAddressToTokensPairName[pairAddress] + '] : TRANSFER ; from [' + from + '] to [' + to + '] value = [' + value + ']')
    })

    //event Approval(address indexed owner, address indexed spender, uint value);
    //event Transfer(address indexed from, address indexed to, uint value);

    process.on('uncaughtException', (err) => {
        if (err) {
            console.log('Uncaught Exception:' + err.message)
            //process.exit(1)
        } else {
            console.log('Uncaught Exception')
        }
    })

    process.on('unhandledRejection', (reason, promise) => {
        //console.log('Unhandled rejection at ', promise, `reason: ${reason.message}`)
        //console.log('Unhandled rejection')
        //process.exit(1)
    })

    process.on('warning', function (err) {
        if ( 'MaxListenersExceededWarning' === err.name ) {
            //process.exit(1); // its up to you what then in my case script was hang
        }
    });

})

function getNow() {
    let now = new Date();
    now = now.toLocaleString().substring(0,10) + ' ' + now.toTimeString().substring(0,8)
    return now + " : "
}

async function getContractName(addressOfContract) {
    let abi = [
        {
            "constant": true,
            "inputs": [],
            "name": "name",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }
    ]

    let testContract = new web3.eth.Contract(abi, addressOfContract)
    return testContract.methods.name().call()
}
