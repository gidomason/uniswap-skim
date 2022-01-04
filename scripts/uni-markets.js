const Web3 = require('web3');
const fs = require('fs');
const events = require('../logs/events.js');

//const web3 = new Web3('ws://localhost:8546');
//const web3 = new Web3.providers.WebsocketProvider("wss://speedy-nodes-nyc.moralis.io/e5a9189dbc2434f16f95c642/eth/mainnet/ws")
//const web3 = new Web3("wss://speedy-nodes-nyc.moralis.io/e5a9189dbc2434f16f95c642/eth/mainnet/ws");
const web3 = new Web3(new Web3.providers.WebsocketProvider("wss://speedy-nodes-nyc.moralis.io/e5a9189dbc2434f16f95c642/eth/mainnet/ws", {
  clientConfig: {
    maxReceivedFrameSize: 100000000,
    maxReceivedMessageSize: 100000000,
  }
}));
//const web3 = new Web3.providers.WebsocketProvider("wss://speedy-nodes-nyc.moralis.io/e5a9189dbc2434f16f95c642/eth/mainnet/archive/ws")
//const web3 = new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/72e17810a98144ed8fd9858977f4e480")
//const web3 = new Web3("wss://mainnet.infura.io/ws/v3/72e17810a98144ed8fd9858977f4e480");



const factoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';

const getPastLogs = async (address, fromBlock, toBlock) => {
	try {
		console.log(`${address} ${fromBlock} ${toBlock}`)
		const response = await web3.eth.getPastLogs({
			fromBlock: fromBlock,
			toBlock: toBlock,
			address: address
//			topics: ['0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9']
});

		const updatedEvents = [...events];

		response.forEach(item => {
			updatedEvents.push(item);
			console.log(`🦄 pair #${updatedEvents.length} deployed in block #${item.blockNumber}`);
		});

		fs.writeFile('./logs/events.js', await `module.exports = ${JSON.stringify(updatedEvents)}`, error => {
			if (error) {
				console.log(error);
			}
		});
	} catch (error) {
		console.log(error);
	}

	setTimeout(() => {
		console.log('updated');
		process.exit();
	}, 2000);
};

getPastLogs(factoryAddress, events[events.length - 1].blockNumber + 1, 'latest');
//getPastLogs(factoryAddress, events[events.length - 1].blockNumber + 1, 11088992);
//getPastLogs(factoryAddress, events[events.length - 1].blockNumber + 1, 11138992);
