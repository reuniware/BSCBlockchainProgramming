// BEP20 Smart contracts scanner around PancakeSwap (Detection of PairCreated events).
// Plus a basic algorithm for detection of potential scam smart contracts and scammers' addresses.
// Results are logged to .txt files.
// Set the detect* variables to true or false according to what information you need (mint/transfer/approve/swap).
// For swap scans, you might want to filter on the minBNB variable (if minBNB=5 then only swaps of amounts greater or equal to 5 BNB will be logged).

const Web3 = require('web3');
const ethers = require('ethers');

require('events').defaultMaxListeners = 1000;

// mainnet
const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
// testnet
//const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

// Création compte
//const account = web3.eth.accounts.create();
const privateKey = "REPLACE BY YOUR PRIVATE KEY";

// Récupération compte par clé privée
const account = web3.eth.accounts.privateKeyToAccount(privateKey)
//console.log(account);
const accounts = web3.eth.getAccounts(console.log);
//console.log(accounts);

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
const dictPairAddressToToken0 = {};
const dictPairAddressToToken1 = {};
const dictPairAddressAndDestSwapCount = {};
const dictSafeSmartContract = {};
const dictSafeSmartContractCreationDateTime = {};
const dictNumberOfSwapsForSmartContract = {};
const dictPreviousNumberOfSwapsForSmartContract = {};

const detectNewTokensPair = false;
const detectMint = false;
const detectApprove = false;
const detectTransfer = false;
const detectSwap = true;

const showDetectedScams = false;

const twitterEnabled = false;
tweet("Experimental SCAM ALERT BOT [Julia Version] Started.");

const viewTokenUrlBase = 'https://charts.bogged.finance/'
//const viewTokenUrlBase = 'https://poocoin.app/tokens/'
const viewAddressUrlBase = 'https://bscscan.com/address/'

const logFiles = {
    SwapLogFile: 'logs_swaps.txt',
    SafeSmartContractsLogFile: 'logs_safe.txt',
    ScamLogFile: 'logs_scams.txt'
}

console.log('BOT STARTED');

deleteFile(logFiles.SafeSmartContractsLogFile)
deleteFile(logFiles.SwapLogFile)
deleteFile(logFiles.ScamLogFile)

factory.on('PairCreated', async (token0, token1, pairAddress) => {

    dictPairAddressToToken0[pairAddress] = token0;
    dictPairAddressToToken1[pairAddress] = token1;

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

    dictPairAddressToTokensPairName[pairAddress] = getTokenNameFromTokenAddress(token0) + ' / ' + getTokenNameFromTokenAddress(token1)
    if (detectNewTokensPair) {
        console.log(getNow() + "New BSC Token Pair : [" + getTokenNameFromTokenAddress(token0) + " / " + getTokenNameFromTokenAddress(token1) + '] ; pairAddress = ' + pairAddress)
        console.log('\t\t\ttoken0 = ' + viewTokenUrlBase + token0 + ' for ' + getTokenNameFromTokenAddress(token0))
        console.log('\t\t\ttoken1 = ' + viewTokenUrlBase + token1 + ' for ' + getTokenNameFromTokenAddress(token1))
        console.log('\t\t\tBSC SCAN PairAddress = ' + viewAddressUrlBase + pairAddress)
    }

    // ADDING OF LIQUIDITY ?
    if (detectMint) {
        const pair = new ethers.Contract(pairAddress, ['event Mint(address indexed sender, uint amount0, uint amount1)'], account2);
        pair.on('Mint', async (sender, amount0, amount1) => {
            if (sender.toLowerCase() === addresses.router.toLowerCase()) sender = 'PancakeRouter'
            if (sender.toLowerCase() === addresses.factory.toLowerCase()) sender = 'PancakeFactory'
            console.log(getNow() + 'MINT : pairAddress = [' + getTokenPairNameFromPairAddress(pairAddress) + '] : sender = [' + sender + '] amount0 = [' + amount0 + '] amount1 = [' + amount1 + ']')
            console.log(getDetails(pairAddress))
        })
    }

    if (detectApprove) {
        const pair2 = new ethers.Contract(pairAddress, ['event Approval(address indexed owner, address indexed spender, uint value)'], account2);
        pair2.on('Approval', async (owner, spender, value) => {
            if (owner.toLowerCase() === addresses.router.toLowerCase()) owner = 'PancakeRouter'
            if (owner.toLowerCase() === addresses.factory.toLowerCase()) owner = 'PancakeFactory'
            if (spender.toLowerCase() === addresses.router.toLowerCase()) spender = 'PancakeRouter'
            if (spender.toLowerCase() === addresses.factory.toLowerCase()) spender = 'PancakeFactory'
            //console.log(getNow() + "pairAddress = " + pairAddress + " : approval ; owner = " + owner + " spender = " + spender + " value = " + value)
            console.log(getNow() + 'APPROVAL : pairAddress = [' + getTokenPairNameFromPairAddress(pairAddress) + '] : owner = [' + owner + '] spender = [' + spender + '] value = [' + value + ']')
            console.log(getDetails(pairAddress))
        })
    }

    if (detectTransfer) {
        const pair3 = new ethers.Contract(pairAddress, ['event Transfer(address indexed from, address indexed to, uint value)'], account2);
        pair3.on('Transfer', async (from, to, value) => {
            if (from.toLowerCase() === addresses.router.toLowerCase()) from = 'PancakeRouter'
            if (from.toLowerCase() === addresses.factory.toLowerCase()) from = 'PancakeFactory'
            if (to.toLowerCase() === addresses.router.toLowerCase()) to = 'PancakeRouter'
            if (to.toLowerCase() === addresses.factory.toLowerCase()) to = 'PancakeFactory'
            //console.log(getNow() + "pairAddress = " + pairAddress + " : transfer ; from = " + from + " to = " + to + " value = " + value)
            console.log(getNow() + 'TRANSFER : pairAddress = [' + getTokenPairNameFromPairAddress(pairAddress) + '] : from [' + from + '] to [' + to + '] value = [' + value + ']')
            console.log(getDetails(pairAddress))
        })
    }

    if (detectSwap) {
        const pair4 = new ethers.Contract(pairAddress, ['event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)'], account2);
        pair4.on('Swap', async (sender, amount0In, amount1In, amount0Out, amount1Out, to) => {

            if(getToken0FromPairAddress(pairAddress) !== addresses.WBNB) {
                dictSafeSmartContract[getToken0FromPairAddress(pairAddress)] = true
                if (dictSafeSmartContractCreationDateTime[getToken0FromPairAddress(pairAddress)] === undefined) dictSafeSmartContractCreationDateTime[getToken0FromPairAddress(pairAddress)] = getNow2()
                if (dictNumberOfSwapsForSmartContract[getToken0FromPairAddress(pairAddress)] === undefined) {
                    dictNumberOfSwapsForSmartContract[getToken0FromPairAddress(pairAddress)] = 1
                } else {
                    dictNumberOfSwapsForSmartContract[getToken0FromPairAddress(pairAddress)]++
                }
            }
            if(getToken1FromPairAddress[pairAddress] !== addresses.WBNB) {
                dictSafeSmartContract[getToken1FromPairAddress(pairAddress)] = true
                if (dictSafeSmartContractCreationDateTime[getToken1FromPairAddress(pairAddress)] === undefined) dictSafeSmartContractCreationDateTime[getToken1FromPairAddress(pairAddress)] = getNow2()
                if (dictNumberOfSwapsForSmartContract[getToken1FromPairAddress(pairAddress)] === undefined) {
                    dictNumberOfSwapsForSmartContract[getToken1FromPairAddress(pairAddress)] = 1
                } else {
                    dictNumberOfSwapsForSmartContract[getToken1FromPairAddress(pairAddress)]++
                }
            }

            let token0IsWBNB = false, token1IsWBNB = false
            token0IsWBNB = (getToken0FromPairAddress(pairAddress) === addresses.WBNB)
            token1IsWBNB = (getToken1FromPairAddress(pairAddress) === addresses.WBNB)

            let show = false
            let minBNB = 0
            if ((token0IsWBNB) && (amount0In / 1000000000000000000 >= minBNB)) show = true
            if ((token1IsWBNB) && (amount1In / 1000000000000000000 >= minBNB)) show = true
            if ((token0IsWBNB) && (amount0Out / 1000000000000000000 >= minBNB)) show = true
            if ((token1IsWBNB) && (amount1Out / 1000000000000000000 >= minBNB)) show = true

            //if (show === true) {
            if (sender.toLowerCase() === addresses.router.toLowerCase()) {
                if (sender.toLowerCase() === addresses.router.toLowerCase()) sender = 'PancakeRouter'
                if (sender.toLowerCase() === addresses.factory.toLowerCase()) sender = 'PancakeFactory'
                if (to.toLowerCase() === addresses.router.toLowerCase()) to = 'PancakeRouter'
                if (to.toLowerCase() === addresses.factory.toLowerCase()) to = 'PancakeFactory'
                if (show === true) {
                    console.log(getNow() + 'SWAP : pairAddress = [' + getTokenPairNameFromPairAddress(pairAddress) + ']')
                    console.log('\t\t\tsender [' + sender + '] amount0In [' + (token0IsWBNB ? (amount0In / 1000000000000000000) + ' WBNB' : amount0In) + '] amount1In [' + (token1IsWBNB ? (amount1In / 1000000000000000000) + ' WBNB' : amount1In) + '] amount0Out [' + (token0IsWBNB ? (amount0Out / 1000000000000000000) + ' WBNB' : amount0Out) + '] amount1Out [' + (token1IsWBNB ? (amount1Out / 1000000000000000000) + ' WBNB' : amount1Out) + '] to [' + to + ']')
                    console.log(getDetails(pairAddress))
                }
                logToFile(logFiles.SwapLogFile, getTokenPairNameFromPairAddress(pairAddress) + ' : sender [' + sender + '] amount0In [' + (token0IsWBNB ? (amount0In / 1000000000000000000) + ' WBNB' : amount0In) + '] amount1In [' + (token1IsWBNB ? (amount1In / 1000000000000000000) + ' WBNB' : amount1In) + '] amount0Out [' + (token0IsWBNB ? (amount0Out / 1000000000000000000) + ' WBNB' : amount0Out) + '] amount1Out [' + (token1IsWBNB ? (amount1Out / 1000000000000000000) + ' WBNB' : amount1Out) + '] to [' + to + ']')
            }
            //}

            if ((to !== 'PancakeRouter') && (to !== '0x0000000000000000000000000000000000000000')) {
                if (dictPairAddressAndDestSwapCount[pairAddress + ' ' + to] === undefined) {
                    dictPairAddressAndDestSwapCount[pairAddress + ' ' + to] = 1
                } else {
                    dictPairAddressAndDestSwapCount[pairAddress + ' ' + to]++
                    if (dictPairAddressAndDestSwapCount[pairAddress + ' ' + to] > 2) {
                        logToFile(logFiles.ScamLogFile, 'Scammer address = ' + viewAddressUrlBase + to)
                        if(getToken0FromPairAddress(pairAddress) !== addresses.WBNB) {
                            dictSafeSmartContract[getToken0FromPairAddress(pairAddress)] = false
                            logToFile(logFiles.ScamLogFile, 'Scam token address = ' + viewAddressUrlBase + getToken0FromPairAddress(pairAddress))

                            const strWithHashTags = strToHashTags(getTokenNameFromTokenAddress(getToken0FromPairAddress(pairAddress)))
                            tweet('Scam token ' + strWithHashTags + ' = ' + viewTokenUrlBase + getToken0FromPairAddress(pairAddress))
                        }
                        if(getToken1FromPairAddress(pairAddress) !== addresses.WBNB) {
                            dictSafeSmartContract[getToken1FromPairAddress(pairAddress)] = false

                            const strWithHashTags = strToHashTags(getTokenNameFromTokenAddress(getToken1FromPairAddress(pairAddress)))
                            tweet('Scam token ' + strWithHashTags + ' = ' + viewTokenUrlBase + getToken1FromPairAddress(pairAddress))
                        }

                        dictPairAddressAndDestSwapCount[pairAddress + ' ' + to] = 0

                        if (showDetectedScams) {
                            console.log('\t\t\t### ' + getTokenPairNameFromPairAddress(pairAddress) + ' : ' + to + ' might be a scammer working with this token ###')
                            console.log(getDetails(pairAddress))
                            console.log('\t\t\tBSC SCAN for address = ' + viewAddressUrlBase + to)
                        }
                    }
                }
            }

            //deleteSafeSmartContractsFile()
            for (const [key, value] of Object.entries(dictSafeSmartContract)) {
                if (value === true) {
                    if (dictPreviousNumberOfSwapsForSmartContract[key] < dictNumberOfSwapsForSmartContract[key]) {
                        logToFile(logFiles.SafeSmartContractsLogFile, '[' + dictTokenAddressToTokenName[key]  + ']' + '\t' + value + '\t' + dictNumberOfSwapsForSmartContract[key] + '\t' + viewTokenUrlBase + key + '\tCreated at ' + getDateToStr(dictSafeSmartContractCreationDateTime[key]) + ' <=> ' + getDateDiffInMinutes(dictSafeSmartContractCreationDateTime[key]) +  ' min');
                    }
                }
            }
            logToFile(logFiles.SafeSmartContractsLogFile, '--------------------------------------------------------------------------------------------------------------------------------------------------------------')

            if(getToken0FromPairAddress(pairAddress) !== addresses.WBNB) {
                dictPreviousNumberOfSwapsForSmartContract[getToken0FromPairAddress(pairAddress)] = dictNumberOfSwapsForSmartContract[getToken0FromPairAddress(pairAddress)]
            }
            if(getToken1FromPairAddress(pairAddress) !== addresses.WBNB) {
                dictPreviousNumberOfSwapsForSmartContract[getToken1FromPairAddress(pairAddress)] = dictNumberOfSwapsForSmartContract[getToken1FromPairAddress(pairAddress)]
            }

        })
    }

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

function getNow2() {
    let now = new Date();
    return now
}

function getDateToStr(date) {
    date = date.toLocaleString().substring(0,10) + ' ' + date.toTimeString().substring(0,8)
    return date
}

function getDateDiffInMinutes(date1) {
    const date2 = new Date();
    const diffTime = Math.abs(date2 - date1);
    return((diffTime/1000/60).toFixed(2));
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

function getDetails(pairAddress) {
    let str = ''
    str += '\t\t\ttoken0 = ' + viewTokenUrlBase + dictPairAddressToToken0[pairAddress] + ' (' + dictTokenAddressToTokenName[dictPairAddressToToken0[pairAddress]] + ')'
    str += '\t\t\ttoken1 = ' + viewTokenUrlBase + dictPairAddressToToken1[pairAddress] + ' (' + dictTokenAddressToTokenName[dictPairAddressToToken1[pairAddress]] + ')'
    str += '\t\t\tBSC SCAN PairAddress = ' + viewAddressUrlBase + pairAddress
    return str
}

function getToken0FromPairAddress(pairAddress) {
    return dictPairAddressToToken0[pairAddress];
}

function getToken1FromPairAddress(pairAddress) {
    return dictPairAddressToToken1[pairAddress];
}

function getTokenNameFromTokenAddress(tokenAddress) {
    return dictTokenAddressToTokenName[tokenAddress]
}

function getTokenPairNameFromPairAddress(pairAddress) {
    return dictPairAddressToTokensPairName[pairAddress]
}

function logToFile(filename, str) {
    let fs = require('fs');
    fs.appendFileSync(filename, getNow() + str + '\r\n', function (err) { })
}

function deleteFile(filename) {
    let fs = require('fs');
    try {
        fs.unlinkSync(filename)
    } catch (e) {}
}

function tweet(str) {
    // Parameters used here were linked to a Twitter account of mine that is now deleted. Please change them if you need to tweet from this code.
    if (twitterEnabled === true) {
        str += '\n#BSC #BinanceSmartChain #PancakeSwap #ScamAlert #Blockchain #BEP20 #ERC20'
        const Twitter = require('twitter');
        const client = new Twitter({
            consumer_key: 'MorX5xvqYCSs7IpvOtPeh0oai',
            consumer_secret: 'XtEyoEDcyFTCLjp9kF1SPFr78Jvu1hiaU5yx2mmWVAMfgAMUq9',
            access_token_key: '1417457007389515787-9B0TYSJNhTm53Bv6UEjrdTND2M0js0',
            access_token_secret: 'CVMtV8Mxutexrx9xDRJ3SdYlT3i9PfLzPrqEFStzFnPqY'
        });
        client.post('statuses/update', {status: str}, function(error, tweet, response) {
            if (!error) {
                //console.log(tweet);
            }
        });
    }

}

function strToHashTags(str) {
    let strWithHashTags = ''
    const words = str.split(' ');
    words.forEach(element => {
        if (element.length>1) {
            strWithHashTags += '#' + element + ' '
        }
    })
    return strWithHashTags
}
