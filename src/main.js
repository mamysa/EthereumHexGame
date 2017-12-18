if (typeof web3 !== 'undefined') {
	web3 = new Web3(web3.currentProvider);
}
else {
	web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545") );
}


var currentAccount = '';

setInterval( function() {
	var account = web3.eth.accounts[0];

	if (currentAccount != account) {
		currentAccount = account;
		console.log(currentAccount);

		web3.eth.defaultAccount = web3.eth.accounts[0];

	}
}, 1000);


function GameInstanceManager(gameFactoryAddress) {
	var self = this;
	this.gameFactory = loadContract(gameFactoryAddress, gameFactoryABI);
	this.gameInstanceMap = { };

	setInterval( function() {
		self.gameFactory.gameInstances(currentAccount, function(err, result) {
			if (!err && result[0]) {
				self.addGameInstance(result);	
			}
		});
	}, 5000);
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

function GameInstance(gameInstanceAddress, player1Address, player2Address) {
	this.address = gameInstanceAddress;
	this.instance = loadContract(gameInstanceAddress, gameInstanceABI);

	this.setTile = {x: -1, y: -1 };

	this.players = [ ];
	this.board = new Board();
	this.color = PieceColor.RED;
	this.moveNumber = 0;

	var self = this;
	this.instance.allEvents( { fromBlock: '0' }, function(err,result) {
		console.log("Contract Event:");
		if (err) {
			console.log("event error");
		}
		if (result) {
			self.processEvent(result);
		}
	});
}

GameInstance.prototype.processEvent = function(result) {
	console.log(result);
	if (result.event == 'onGameStarted') {
		//this.players.push( { player: result.args.p1, color: 
		var player1 = result.args.p1;
		var player2 = result.args.p2;
		var player1color = result.args.p1color.toNumber();
		var player2color = result.args.p2color.toNumber();
		this.players.push({ player: player1, color: player1color });
		this.players.push({ player: player2, color: player2color });
		console.log(this.players);
	}
}

GameInstance.prototype.myTurn = function() {
	return (currentAccount == this.players[this.moveNumber % 2].player);
}

/**
 * Fire transaction when user places the piece
 */
GameInstance.prototype.placePiece = function(pieceLocation) {
	var x = web3.toBigNumber(pieceLocation.x);	
	var y = web3.toBigNumber(pieceLocation.y);	
	var p = web3.toBigNumber(this.color);
	var m = web3.toBigNumber(this.moveNumber);
	console.log("here");
	this.instance.placePiece(x, y, p, m, { }, function(err, result){
		if (err) {
			//user cancelled transaction
			console.log(err);
		}
		if (result) {
			console.log(result);
		}
	});
}

/**
 * call placePieceAndCheckWinningCondition.
 */
GameInstance.prototype.placePieceAndCheckWinningCondition = function(pieceLocation, path) {
	var a = [];
	for (var i = 0; i < path.length; i++) {
		a.push(web3.toBigNumber(path[i].x));
		a.push(web3.toBigNumber(path[i].y));
	}
	var x = web3.toBigNumber(pieceLocation.x);	
	var y = web3.toBigNumber(pieceLocation.y);	
	var p = web3.toBigNumber(this.color);
	var m = web3.toBigNumber(this.moveNumber);

	this.instance.placePieceAndCheckWinningCondition(x, y, p, m, a, { }, function(err, result) {
		if (err) {
			// user cancelled transaction
			console.log(err);
		}
		if (result) {
			console.log(result);
		}
	});
}

/**
 * Second to go player can choose to swap his piece color with opponent's. Can be 
 * done only once in the game.
 */
GameInstance.prototype.swapPieceColor = function() {
	var m = web3.toBigNumber(this.moveNumber);

	this.instance.swapPieceColor(m, { }, function(err, result) {
		if (err) {
			console.log(err);
		}
		if (result) {
			console.log(result);
		}
	});
}

/**
 * Process board click. 
 */ 
GameInstance.prototype.onBoardClick = function(pieceLocation) {
	if (!this.myTurn()) {
		console.log("Not my turn!");
		return;
	}

	this.board.setCell(pieceLocation, this.color);
	updateView(pieceLocation, this.color);
	var path = findPath(this.board, this.color);

	if (path.length == 0) {
		this.placePiece(pieceLocation);	
	}

	// looks like we have found a path, can call placePieceandCheckWinningCondition.
	if (path.length != 0) {
		this.placePieceAndCheckWinningCondition(pieceLocation, path);	
	}
}

initializeView();
