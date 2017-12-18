if (typeof web3 !== 'undefined') {
	web3 = new Web3(web3.currentProvider);
	console.log("here");
}
else {
	web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545") );
	console.log("local provider");
}


var currentAccount = '';

setInterval( function() {
	var account = web3.eth.accounts[0];
	if (currentAccount != account) {
		currentAccount = account;
		console.log(currentAccount);
	}
}, 1000);


function GameInstanceManager(gameFactoryAddress) {
	var self = this;
	this.gameFactory = loadContract(gameFactoryAddress, gameFactoryABI);
	this.gameInstanceMap = { };

	setInterval( function() {
		self.gameFactory.liveGames(currentAccount, function(err, result) {
			if (!err && result[0]) {
				self.addGameInstance(result);	
			}
		});
	}, 4000);
}


GameInstanceManager.prototype.addGameInstance = function(gameInfo) {
	var gameInstanceAddress = gameInfo[3];	
	var p1Address = gameInfo[1];	
	var p2Address = gameInfo[2];	

	if (!(gameInstanceAddress in this.gameInstanceMap)) { 
		var instance = new GameInstance(gameInstanceAddress, p1Address, p2Address);
		this.gameInstanceMap[gameInstanceAddress] = instance;
		currentGameInstance = instance; 
	}
}

GameInstanceManager.prototype.removeGameInstance = function(gameAddress) {


}

var gameFactory = new GameInstanceManager(gameFactoryAddress);
var currentGameInstance = null;

/*
 * Poll currently live games, every 2 seconds
 */
/*
setInterval( function() {
	gameFactory.liveGames(currentAccount, function(err, result) { 
		if (currentGameInstance == null && result[0] == true) {
			currentGameInstance = new GameInstance(result[3], gameInstanceABI);
			currentGameInstance.begin();
		}
	});
}, 5000);
*/

function GameInstance(gameInstanceAddress, player1Address, player2Address) {
	this.address = gameInstanceAddress;
	this.instance = loadContract(gameInstanceAddress, gameInstanceABI);

	this.setTile = {x: -1, y: -1 };
	this.board = new Board();
	this.color = PieceColor.RED;


	this.instance.allEvents( { fromBlock: '0' }, function(err,result) {
		console.log("Contract Event:");
		console.log(result);
	});


	console.log(this.instance);

	/*
	var onGameStarted = this.instance.onGameStarted({ }, {fromBlock: '0'} );
	onGameStarted.watch( function(err, result) {
		console.log(result);
	});
	*/
}

/**
 * Fire transaction when user places the piece
 */
GameInstance.prototype.placePiece = function(pieceLocation) {

}

/**
 * Second to go player can choose to swap his piece color with opponent's. Can be 
 * done only once in the game.
 */
GameInstance.prototype.swapColors = function() {

}

/**
 * Process board click. 
 */ 
GameInstance.prototype.onBoardClick = function(pieceLocation) {
	this.board.setCell(pieceLocation, this.color);
	updateView(pieceLocation, this.color);
	var path = findPath(this.board, this.color);
	

	console.log(path);
	if (path.length != 0) {

		pathToSolidityArray(this.board, path, this.color);
		path.forEach(e => {
			var cell = document.getElementById(`${e.x},${e.y}`);
			cell.setAttributeNS(null, 'fill', 'green');
		});
	}
}


initializeView();
