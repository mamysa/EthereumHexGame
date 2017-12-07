// initialize web3 provider.
if (typeof web3 !== 'undefined') {
	web3 = new Web3(web3.currentProvider);
}
else {
	web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545") );
}
//web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545") );

var gameFactoryAddress = '0x239903603eDE7dB9988fd92b825cEf3bE9834E19';
var gameFactoryABI = [{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"liveGames","outputs":[{"name":"isset","type":"bool"},{"name":"player1","type":"address"},{"name":"player2","type":"address"},{"name":"gameInstance","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"gameInstance","type":"address"},{"name":"p1","type":"address"},{"name":"p2","type":"address"}],"name":"endGame","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"startGame","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_version","type":"bytes32"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"}] 

var gameInstanceABI =[{"constant":false,"inputs":[{"name":"x","type":"uint256"},{"name":"y","type":"uint256"},{"name":"color","type":"uint8"}],"name":"placePiece","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"endGame","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getField","outputs":[{"components":[{"name":"piece","type":"uint8"},{"name":"cellType","type":"uint8"}],"name":"","type":"tuple[121]"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"turnPlayer","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"mappingPlayerColor","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"gameField","outputs":[{"name":"piece","type":"uint8"},{"name":"cellType","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"gameOver","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_parentContract","type":"address"},{"name":"_player1","type":"address"},{"name":"_player2","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"gameInstance","type":"address"},{"indexed":false,"name":"p1","type":"address"},{"indexed":false,"name":"p2","type":"address"}],"name":"onGameStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"winner","type":"address"}],"name":"onGameEnded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"x","type":"uint256"},{"indexed":false,"name":"y","type":"uint256"},{"indexed":false,"name":"pieceColor","type":"uint8"}],"name":"onPiecePlaced","type":"event"}] 

// setup listener for user switching accounts. kick him from the game if we have to.
var currentAccount = '';
setInterval( function() {
	var account = web3.eth.accounts[0];
	if (currentAccount != account) {
		currentAccount = account;
		// TODO change state
	}
}, 1000);

// Load game factory contract
var gameFactory = loadContract(gameFactoryAddress, gameFactoryABI);
console.log(gameFactory);


// calls start game method on gameFactory. 
function startGame() {
	console.log("Start Game");
	gameFactory.startGame( function(error, result) {
		if (!error)
			console.log(result);
	});
}


var currentGameInstance = null; 

/*
setInterval( function() {
	gameFactory.liveGames(currentAccount, function(err, result) { 
		if (currentGameInstance == null && result[0] == true) {
			currentGameInstance = new GameInstance(result[3], gameInstanceABI);
			currentGameInstance.begin();
		}
	});
}, 40000);
*/

// contract loader helper
function loadContract(address, abi) {
	return web3.eth.contract(abi).at(address);
}

function GameInstance(gameInstanceAddress, gameInstanceABI) {
	//this.address = gameInstanceAddress;
	//this.instance = loadContract(gameInstanceAddress, gameInstanceABI);
	console.log("here");

	/*
	var self = this;
	this.instance.allEvents( { fromBlock: '0',  }, function(err, result){ 
		console.log(result);	
	});
	*/

	this.color = PieceColor.NONE;
	this.board = new Board();
	this.timer = null;
}

GameInstance.prototype.begin = function() {
	var self = this;
	this.instance.gameField(function(err, result) { 
			console.log(result);
	});

	/*
	this.timer = setInterval(function() {
		
	}, 5000);
	*/


}

GameInstance.prototype.end = function() {

}


function toGameState() {
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttributeNS(null,"id","svgDoc");
	svg.setAttributeNS(null,"height","100%");
	svg.setAttributeNS(null,"width","100%");

	document.getElementsByTagName('body')[0].appendChild(svg);

	var board = new Board();
	var boardSvg = getSVGBoard();
	svg.appendChild(boardSvg);
}



toGameState();
