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
		gameFactory.reset();
		resetView();
	}
}, 1000);


function GameInstanceManager(gameFactoryAddress) {
	this.gameFactory = loadContract(gameFactoryAddress, gameFactoryABI);
	this.gameInstanceMap = { };
	this.currentGameInstance = null;
}

/**
 * Reset state when user switches wallets. Do this to prevent inconsistent 
 * GameInstances.
 */
GameInstanceManager.prototype.reset = function() {
	this.currentGameInstance = null;
	this.gameInstanceMap = { };

	// update view 
	var table = document.getElementById('game_table');
	var tbody = document.createElement('tbody'); tbody.id = 'table_body';
	table.removeChild(document.getElementById('table_body'));
	table.appendChild(tbody);

	var self = this;
	this.gameFactory.allEvents( { fromBlock: '0' }, function(err,result) {
		var args = result.args;
		if (result.event == 'onGameInstanceCreated') {
			if (currentAccount == args.p1 || currentAccount == args.p2) {
				self.addGameInstance(args.gameInstance, args.p1, args.p2);

				//TODO maybe store in local storage?
			}
		}
	});
}

GameInstanceManager.prototype.addGameInstance = function(gameInstanceAddress, p1, p2) {
	console.log("hererere");
	if (!(gameInstanceAddress in this.gameInstanceMap)) { 
		console.log("add game instance");
		var instance = new GameInstance(gameInstanceAddress, p1, p2);
		this.gameInstanceMap[gameInstanceAddress] = instance;

		// update view
		createTableEntry(gameInstanceAddress, p1, p2);
	}
}

GameInstanceManager.prototype.setCurrentGameInstance = function(gameAddress) {
	this.currentGameInstance = this.gameInstanceMap[gameAddress];
	this.currentGameInstance.setDrawable(true);
	this.currentGameInstance.draw();
}

GameInstanceManager.prototype.getCurrentGameInstance = function() {
	return this.currentGameInstance;
}

var gameFactory = new GameInstanceManager(gameFactoryAddress);

function GameInstance(gameInstanceAddress, player1Address, player2Address) {
	this.address = gameInstanceAddress;
	this.instance = loadContract(gameInstanceAddress, gameInstanceABI);

	// stores currently selected cell.
	this.selectedCell = null;

	// path that we have discovered using DFS.
	this.possibleWinningPath = null;

	this.players = [ ];
	this.board = new Board();
	this.moveNumber = 0;

		
	this.winner = '';

	this.isDrawable = false;

	var self = this;

	this.instance.allEvents( { fromBlock: '0' }, function(err,result) {
		if (err) {
			console.log("event error");
		}
		if (result) {
			self.processEvent(result);
		}
	});
}

/**
 * If false, all calls to update updateView will not be executed.
 */
GameInstance.prototype.setDrawable = function(value) {
	this.isDrawable = value;
}

/**
 * Redraw board from local state
 */
GameInstance.prototype.draw = function() {
	for (x = 0; x < BOARD_SIZE; x++)
	for (y = 0; y < BOARD_SIZE; y++) {
		var loc = {x: x, y: y};
		updateView(loc, this.board.getCell(loc));
	}
}

GameInstance.prototype.processEvent = function(result) {
	console.log(result);
	var args = result.args;
	if (result.event == 'onGameStarted') {
		var player1 = args.p1;
		var player2 = args.p2;
		var player1color = args.p1color.toNumber();
		var player2color = args.p2color.toNumber();
		this.players.push({ player: player1, color: player1color });
		this.players.push({ player: player2, color: player2color });
	}

	if (result.event == 'onPiecePlaced') {
		var x = args.x.toNumber();
		var y = args.y.toNumber();
		var player = args.player;
		var color = args.pieceColor.toNumber();
		var movenum = args.movenum.toNumber();

		console.log(x, y, player, color, movenum);

		var cell = { x: x, y: y };
		if (this.isDrawable) 
			updateView(cell, color);
		this.board.setCell(cell, color);
		this.moveNumber = movenum + 1;
	}

	if (result.event == 'onPieceSwapped') {
		var movenum = args.movenum.toNumber();
		this.players[0].color = PieceColor.BLU;
		this.players[1].color = PieceColor.RED;
		this.moveNumber = movenum + 1;
	}

	if (result.event == 'onGameEnded') {
		this.winner = args.winner;	
	}
}

GameInstance.prototype.isMyTurn = function() {
	return (currentAccount == this.players[this.moveNumber % 2].player);
}

GameInstance.prototype.getMyColor = function() {
	if (currentAccount == this.players[0].player) { return this.players[0].color; }
	if (currentAccount == this.players[1].player) { return this.players[1].color; }
	return PieceColor.UNOCCUPIED;
}

/**
 * Fire transaction when user places the piece
 */
GameInstance.prototype.placePiece = function(pieceLocation, color) {
	var x = web3.toBigNumber(pieceLocation.x);	
	var y = web3.toBigNumber(pieceLocation.y);	
	var p = web3.toBigNumber(color);
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
GameInstance.prototype.placePieceAndCheckWinningCondition = function(pieceLocation, color, path) {
	var a = [];
	for (var i = 0; i < path.length; i++) {
		a.push(web3.toBigNumber(path[i].x));
		a.push(web3.toBigNumber(path[i].y));
	}
	var x = web3.toBigNumber(pieceLocation.x);	
	var y = web3.toBigNumber(pieceLocation.y);	
	var p = web3.toBigNumber(color);
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
 * Player can choose to end the game at any time. Person ending the game will lose the 
 * round!
 */
GameInstance.prototype.forfeit = function() {
	this.instance.endGame({from: currentAccount}, function(err, result) {
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
	if (!this.isMyTurn()) {
		console.log('Not my turn');
		return;
	}

	var color = this.getMyColor();

	// reset selectedCell
	if (this.selectedCell != null) {
		this.board.setCell(this.selectedCell, PieceColor.UNOCCUPIED);
		if (this.isDrawable) 
			updateView(this.selectedCell, PieceColor.UNOCCUPIED);
		this.selectedCell = null;
	}
		
	if (this.board.getCell(pieceLocation) == PieceColor.UNOCCUPIED) {
		this.board.setCell(pieceLocation, color);
		if (this.isDrawable) 
			updateView(pieceLocation, color);
		this.selectedCell = pieceLocation;
	}
}

GameInstance.prototype.onPlacePieceClick = function() {
	if (this.selectedCell == null) {
		console.log('Select piece first!');
		return;
	}

	var color = this.getMyColor();
	var path = findPath(this.board, color); 

	if (path.length == 0) {
		this.placePiece(this.selectedCell, color);
	}
	if (path.length != 0) {
		this.placePieceAndCheckWinningCondition(this.selectedCell, color, path);
	}

	this.selectedCell = null;
}


function onPlacePiecePressed() {
	var currentGameInstance = gameFactory.getCurrentGameInstance();
	if (currentGameInstance != null) {
		currentGameInstance.onPlacePieceClick();
	}
}

function onForfeitPressed() {
	var currentGameInstance = gameFactory.getCurrentGameInstance();
	if (currentGameInstance != null) {
		currentGameInstance.forfeit();
	}
}

function onOpenPressed() {
	gameFactory.setCurrentGameInstance(this.id);
}

function createTableEntry(gameAddress, player1, player2) {
	var tr = document.createElement('tr');	
	var td1 = document.createElement('td');
	var td2 = document.createElement('td');
	var td3 = document.createElement('td');
	var td4 = document.createElement('td');
	var button = document.createElement('button');
	button.classList.add('pure-button');
	button.classList.add('pure-button-primary');
	button.innerHTML = 'Open';
	button.addEventListener('click', onOpenPressed);
	button.id = gameAddress;
	td1.innerHTML = gameAddress;
	td2.innerHTML = player1;
	td3.innerHTML = player2;

	td4.appendChild(button);
	tr.appendChild(td1);
	tr.appendChild(td2);
	tr.appendChild(td3);
	tr.appendChild(td4);

	document.getElementById('table_body').appendChild(tr);
}




initializeView();
