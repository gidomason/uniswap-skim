const Web3 = require('web3');

const pairAbi = require('../abi/uniswap-V2-pair-abi.js');
const events = require('../logs/events.js');
const erc20abi = require('../abi/erc20-abi.js');
const tokenBlackList = require('./blacklist.js');
const whitelist = require('./whitelist.js');

const axios = require('axios').default;

//const web3 = new Web3('ws://localhost:8546');
//https://mainnet.infura.io/v3/72e17810a98144ed8fd9858977f4e480
const web3 = new Web3("wss://speedy-nodes-nyc.moralis.io/e5a9189dbc2434f16f95c642/eth/mainnet/ws")
//const web3 = new Web3(
//  new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/72e17810a98144ed8fd9858977f4e480")
//  new Web3.providers.WebsocketProvider("wss://speedy-nodes-nyc.moralis.io/e5a9189dbc2434f16f95c642/eth/mainnet/ws")
//  new Web3("wss://speedy-nodes-nyc.moralis.io/e5a9189dbc2434f16f95c642/eth/mainnet/ws")
//);

const createPairTopic = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';
const lastPair = '';

let i = 0;
const minDollarValue = 0.01;
const markDollarValue = 100;
var ETHprice=1;


const getPairs = async count => {
	if (count < events.length) {
		if (events[count].topics[0] === createPairTopic) {
			const pairAdd = `0x${events[count].data.slice(26, 66)}`;
			const token0Add = `0x${events[count].topics[1].slice(26, 66)}`;
			const token1Add = `0x${events[count].topics[2].slice(26, 66)}`;

			const badToken = tokenBlackList.includes(token0Add) || tokenBlackList.includes(token1Add);

			try {
				if (!badToken) {
					const token0contract = await new web3.eth.Contract(
						erc20abi,
						token0Add
					);

					const token1contract = await new web3.eth.Contract(
						erc20abi,
						token1Add
					);

					const pairContract = await new web3.eth.Contract(
						pairAbi,
						pairAdd
					);
//					console.log('Before names');

					var name0='';
					var name1='';
					try{
					    name0 = getName(token0Add) !== false ? getName(token0Add) : await token0contract.methods.name().call();

					    name1 = getName(token1Add) !== false ? getName(token1Add) : await token1contract.methods.name().call();
					}
					catch (error) {
//					    console.log(`Names ERROR error in pair: ${pairAdd} , token0Add : ${token0Add} , token1Add : ${token1Add}`);
//					    console.log(`${pairContract.abi} ${token0contract} ${token1contract}`);
					    name0='ERR'
					    name1='ERR'
					};

//					console.log('After names');

					const reserves = await pairContract.methods
						.getReserves()
						.call();
//					console.log(reserves);

					const balanceRaw0 = await token0contract.methods
						.balanceOf(pairAdd)
						.call();
//					console.log(balanceRaw0);

					const balanceRaw1 = await token1contract.methods
						.balanceOf(pairAdd)
						.call();
//					console.log(balanceRaw1);

					const reserveRaw0 = await reserves[0];
					const reserveRaw1 = await reserves[1];

					var decimals0=18;
					var decimals1=18;
					try{
					decimals0 = await token0contract.methods.decimals().call();
//					console.log(decimals0);
					decimals1 = await token1contract.methods.decimals().call();
//					console.log(decimals1);
					}
					catch(error){
//						console.log('decimals ERROR');
					}

					const balance0 = splitBN(balanceRaw0, decimals0, true);
					const reserve0 = splitBN(reserveRaw0, decimals0, true);
					const balance1 = splitBN(balanceRaw1, decimals1, true);
					const reserve1 = splitBN(reserveRaw1, decimals1, true);

					const difference0 = balanceRaw0 - reserveRaw0;
					const difference1 = balanceRaw1 - reserveRaw1;

//					console.log('Before pair');

					const pair = {
						pairAddress: pairAdd,
						pairIndex: count,
						token0: {
							address: token0Add,
							name: name0,
							decimals: decimals0,
							balance: balance0,
							reserve: reserve0,
							imbalance: difference0.toString() > 0 ? {
								diff: splitBN(difference0.toString(), decimals0, true),
								usdPrice: await getPrice(token0Add),
								value: await getValue(splitBN(difference0.toString(), decimals0, false), await getPrice(token0Add))
							} : false
						},
						token1: {
							address: token1Add,
							name: name1,
							decimals: decimals1,
							balance: balance1,
							reserve: reserve1,
							imbalance: difference1.toString() > 0 ? {
								diff: splitBN(difference1.toString(), decimals1, true),
								usdPrice: await getPrice(token1Add),
								value: await getValue(splitBN(difference1.toString(), decimals1, false), await getPrice(token1Add))
							} : false
						}
					};
//					console.log('After pair');

					if (
						pair.token0.imbalance !== false ||
            pair.token1.imbalance !== false
					) {
						if (
							pair.token0.imbalance.value === 'no coingecko price' ||
              pair.token1.imbalance.value === 'no coingecko price'
						) {
							console.log(`${JSON.stringify(pair, null, 2)},`);
						} else if (
							Number(pair.token0.imbalance.value) > minDollarValue ||
              Number(pair.token1.imbalance.value) > minDollarValue
						) {
							if (
							Number(pair.token0.imbalance.value) > markDollarValue ||
              Number(pair.token1.imbalance.value) > markDollarValue
							){
							    console.log('!!!');
							}

							if (pair.token0.imbalance.value) {
								pair.token0.imbalance.value = `$${(pair.token0.imbalance.value)} 🦄`;
							}

							if (pair.token1.imbalance.value) {
								pair.token1.imbalance.value = `$${(pair.token1.imbalance.value)} 🦄`;
							}
							console.log(`${JSON.stringify(pair, null, 2)},`);
						}
					}
				}
			} catch (error) {
				console.log(
					`error in pair: 0x${events[count].data.slice(26, 66)},

            ${error} ${events[count]}`
				);
				if (error.toString()=='Error: connection not open on send()'){
				    process.exit(1);
				}

//				console.trace();
    if (error.stack && 0) {
      console.log('\nStacktrace:')
      console.log('====================')
      console.log(error.stack);
    }

			}
		}

		i++;
		getPairs(i);
	} else {
		console.log('finsihed');
		process.exit();
	}
};

const getName = address => {
	if (whitelist.some(token => token.address === address)) {
		const t = whitelist.find(token => token.address === address);
		return t.name;
	}

	return false;
};

const splitBN = (number, dec, comma) => {

	let numberConverted = number;

	if (number.includes('e')) {
		numberConverted = (Number(number)).toLocaleString('fullwide', {
			useGrouping: false
		});
	}

	const aboveZero = numberConverted.length > dec ? numberConverted.slice(0, Math.max(0, numberConverted.length - dec)) : 0;
	let belowZero = numberConverted.length < dec ? numberConverted.padStart(dec, '0') : numberConverted.slice(numberConverted.length - dec, numberConverted.length);

	if (dec === "0") {
		belowZero = "0";
	}

	if (comma) {
		return `${Number(aboveZero).toLocaleString()}.${belowZero}`;
	} else {
		return `${aboveZero}.${belowZero}`;
	}
};

const getPrice2 = address => {
		var price=-1;
		axios.post(`https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2`,{
						query: `{token(id: "${address}") { derivedETH } }`})
		.then((res) => {
		    price=parseFloat(res.data.data.token.derivedETH);
//		    console.log(price);
//		    return price;
		})
		.catch((error) => {
		    console.error(error)
		})
		if (price==-1){
		    return 'no coingecko price';
		} else{
		    return price;
		}
}

const getPrice = async address => {
	try {
		const response = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${address}&vs_currencies=USD`);
		const price = await response.data[address].usd;
		return price;
	} catch {
		try{
		const response = await axios.post(`https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2`,{
						query: `{token(id: "${address}") { derivedETH } }`});
//https://thegraph.com/hosted-service/subgraph/elrakabawi/pancakeswap?selected=playground BSC
//		const price=parseFloat(await response.data.data.token.derivedETH);
		const price=Number(parseFloat(await response.data.data.token.derivedETH)*ETHprice);
//		const price=parseNumber(await response.data.data.token.derivedETH);

		return price;
		}
		catch{
		    return 'no coingecko price';
		}
	}
};

const getValue = (amount, price) => {
	if (price === 'no coingecko price') {
		return price;
	}

	const amnt = typeof amount === 'number' ? amount : Number(amount);
	const prc = typeof price === 'number' ? price : Number(price);
	const value = Number(amnt * prc).toFixed(2);
	return Number(value).toLocaleString();
};

getPrice('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2').then(x=>{  //WETH
    console.log(x);
    ETHprice=x;
})
//console.log(ETHprice);
//const testPrice=getPrice('0xbb824f2dfb75e15199077d106872c9aa47bd93b4');
var TestPrice;
(async () => {
    TestPrice=await getPrice('0xbb824f2dfb75e15199077d106872c9aa47bd93b4');
    console.log(TestPrice);
//    console.log(await ETHprice*TestPrice);
//   console.log(await getPrice('0xbb824f2dfb75e15199077d106872c9aa47bd93b4'))
})()
//console.log(TestPrice);

//getPrice('0xbb824f2dfb75e15199077d106872c9aa47bd93b4').then(console.log());
//console.log(testPrice);
getPairs(i);
