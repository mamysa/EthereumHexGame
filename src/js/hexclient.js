/*
if (typeof web3 !== 'undefined') {
	web3 = new Web3(web3.currentProvider);
}
else {
	console.log("no provider");
	web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545") );
}
*/
/*
web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545") );

var currentAccount = '';
var gameFactoryAddress = '0x95c18edbbfa7b359eC73De732bEc6E0540474512';
var gameFactoryABI = [{"constant":false,"inputs":[{"name":"gameInstance","type":"address"},{"name":"p1","type":"address"},{"name":"p2","type":"address"}],"name":"endGame","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"startGame","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_version","type":"bytes32"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"gameInstance","type":"address"},{"indexed":false,"name":"p1","type":"address"},{"indexed":false,"name":"p2","type":"address"}],"name":"onGameStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"gameInstance","type":"address"},{"indexed":false,"name":"p1","type":"address"},{"indexed":false,"name":"p2","type":"address"}],"name":"onGameEnded","type":"event"}];

var gameInstanceABI = [{"constant":false,"inputs":[{"name":"row","type":"uint256"},{"name":"col","type":"uint256"},{"name":"color","type":"uint8"}],"name":"placePiece","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"endGame","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"mappingPlayerColor","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"},{"name":"","type":"uint256"}],"name":"gameField","outputs":[{"name":"piece","type":"uint8"},{"name":"cellType","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_parentContract","type":"address"},{"name":"_player1","type":"address"},{"name":"_player2","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"row","type":"uint256"},{"indexed":false,"name":"col","type":"uint256"},{"indexed":false,"name":"pieceColor","type":"uint8"}],"name":"onPiecePlaced","type":"event"}];


setInterval( function() {
	var account = web3.eth.accounts[0];
	if (currentAccount != account) {
		currentAccount = account;
		// change state
	}
	//console.log(currentAccount);
}, 1000);



// try to load gameFactoryContract
var gameFactoryContract;
var gameFactory;

gameFactoryContract = web3.eth.contract(gameFactoryABI);
gameFactory = gameFactoryContract.at(gameFactoryAddress);


function startGame() {
	console.log("Start Game");
	gameFactory.startGame( function(error, result) {
		if (!error)
			console.log(result);
		else 
			console.error(error);
	
	});
}


var gameInstanceAddress = '0x78A962a998e514B662CdCDD0835d8368a4Fd5DCA';
var gameInstanceContract = web3.eth.contract(gameInstanceABI);
var gameInstance = gameInstanceContract.at(gameInstanceAddress);

function endGame() {
	console.log("End Game");
	gameInstance.endGame( function(error, result) {
		if (!error)
			console.log(result);
		else 
			console.error(error);
	});
}




console.log(gameFactory);

gameFactory.onGameStarted({}, { fromBlock: '0', toBlock: 'latest' }, function(err, result) {
	console.log("onGameStarted");
	console.log(result);
});


gameFactory.onGameEnded({}, { fromBlock: '0', toBlock: 'latest' }, function(err, result) {
	console.log(eventEmitter);
});
*/

function getHexCoordinates(px, py, radius) {
	coords = "";
	for (var degrees = 30; degrees < 360; degrees+=60) {
		var rads = degrees * (Math.PI / 180)
		var x = px + Math.cos(rads)*radius;
		var y = py + Math.sin(rads)*radius;
		coords = coords + x+','+y+' ';
	}
	return coords;
}

var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttributeNS(null,"id","svgDoc");
svg.setAttributeNS(null,"height","100%");
svg.setAttributeNS(null,"width","100%");
document.getElementsByTagName('body')[0].appendChild(svg);


var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
line.setAttributeNS(null,"x1", ""+(screen.width * 0.5));
line.setAttributeNS(null,"x2", ""+(screen.width * 0.5));
line.setAttributeNS(null,"y1", '0.0');
line.setAttributeNS(null,"y2", '0.0');
line.style.stroke = "black";
line.style.strokeWidth = "4px";
svg.appendChild(line);

function click(e) {
	console.log("clicked " + this.id);
	this.style.fill = "black";
}

var CellType = {
	ALL: 1,
	REDTARGET: 2,
	BLUTARGET: 3,
	ANYTARGET: 4
};

var PieceColor = {
	RED: 1,
	BLU: 2,
	UNOCCUPIED: 3
};



function Cell(type, color) {
	this.type = type;
	this.color = color;
	this.drawable = null;
}

const BOARD_SIZE = 11;

// The board can be represented as 11x11 matrix. The rows of the board are stored
// on diagonals of this matrix, from bottom left to top right. 
// The first and last columns are red targets, first and last rows are blue targets.
// Corners of the matrix can both be red and blue targets.
function Board() {
	this.board = [];

	for (var i = 0; i < BOARD_SIZE*BOARD_SIZE; i++) {
		this.board[i] = new Cell(CellType.ALL, PieceColor.UNOCCUPIED);
	}

	for (var i = 0; i < BOARD_SIZE; i++) {
		var l = i * BOARD_SIZE;
		var r = i * BOARD_SIZE + BOARD_SIZE - 1;
		this.board[l].type = CellType.REDTARGET;
		this.board[r].type = CellType.REDTARGET;
	}

	for (var i = 0; i < BOARD_SIZE; i++) {
		var d = (BOARD_SIZE - 1) * BOARD_SIZE + i;
		this.board[i].type = CellType.BLUTARGET;
		this.board[d].type = CellType.BLUTARGET;
	}

	this.board[0].type = CellType.ANYTARGET;
	this.board[BOARD_SIZE-1].type  = CellType.ANYTARGET; 
	this.board[(BOARD_SIZE-1)*BOARD_SIZE].type = CellType.ANYTARGET;
	this.board[(BOARD_SIZE-1)*BOARD_SIZE+BOARD_SIZE-1].type = CellType.ANYTARGET; 
}


Board.prototype.getDrawable = function() {
	var w = screen.width;
	var h = screen.height;
	var r = 25;

	var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
	
	var matrixDiagonalCol = 1;
	for (var row = 0; row < BOARD_SIZE+BOARD_SIZE-1; row++) {
		var cells = (row < BOARD_SIZE) ? row : (BOARD_SIZE+BOARD_SIZE -2 - row)
		var posx = -cells * r;
		var posy = row * r * 1.75;

		// mapping drawable grid coordinates to matrix coordinates
		var matrixRow = cells;
		var matrixCol = 0;
		if (matrixRow != row) {
			matrixRow = BOARD_SIZE - 1;
			matrixCol = matrixDiagonalCol;
			matrixDiagonalCol += 1;
		}

		for (var cell = 0; cell <= cells; cell++) {
			var elem = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
			var x = posx + cell * r * 2;
			var y = posy;

			elem.setAttributeNS(null, 'points', getHexCoordinates(x, y, r));
			elem.style.fill = 'red';
			elem.id = `${matrixRow},${matrixCol}`;
			elem.addEventListener('click', click)
			group.appendChild(elem);

			this.board[matrixRow * BOARD_SIZE + matrixCol].drawable = elem;

			matrixRow -= 1;
			matrixCol += 1;
		}
	}

	var tx = w * 0.5;
	var ty = h * 0.001;
	var rx = 0;
	var ry = 10*1.75*r;
	group.setAttributeNS(null,"transform",`rotate(90,${rx},${ry}) translate(${ty},-${tx}) `);
	return group;
}

var board = new Board();
console.log(board);
var boardDrawable = board.getDrawable();
svg.appendChild(boardDrawable);

// TODO LIST
// 1. Setup account listener.
// 2. Publish initial game contact.
// 3. Game state management.
// 		-> If user not in mapping, display play button
// 		-> Otherwise, get contract Id and use that.
// 		GameStack

