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
	var self = this;
	this.board = [];

	for (var i = 0; i < BOARD_SIZE*BOARD_SIZE; i++) {
		this.board[i] = new Cell(CellType.ALL, PieceColor.UNOCCUPIED);
	}

	var coordinates;
	coordinates = this.getDestinationCellCoordinates(PieceColor.RED);
	coordinates.forEach( function(elem) {
		self.board[self.indexOf(elem)].type = CellType.REDTARGET;
	});

	coordinates = this.getDestinationCellCoordinates(PieceColor.BLU);
	coordinates.forEach( function(elem) {
		self.board[self.indexOf(elem)].type = CellType.BLUTARGET;
	});

	// set corners of the board as target for any player.
	this.board[0].type = CellType.ANYTARGET;
	this.board[BOARD_SIZE-1].type  = CellType.ANYTARGET; 
	this.board[(BOARD_SIZE-1)*BOARD_SIZE].type = CellType.ANYTARGET;
	this.board[(BOARD_SIZE-1)*BOARD_SIZE+BOARD_SIZE-1].type = CellType.ANYTARGET; 

	console.log(this.getNeighbours({x: 0, y: 1}));
}

Board.prototype.indexOf = function(c) {
	return c.y * BOARD_SIZE + c.x;
}

Board.prototype.setCell = function(coordinates, pieceColor) {
	this.board[this.indexOf(coordinates)].color = pieceColor;
}

Board.prototype.getCell = function(coordinates) {
	return this.board[this.indexOf(coordinates)].color;
}

Board.prototype.getNeighbours = function(n) {
	cells = [];
	cells.push( { x: n.x - 1, y: n.y } );
	cells.push( { x: n.x + 1, y: n.y } );
	cells.push( { x: n.x, y: n.y - 1 } );
	cells.push( { x: n.x, y: n.y + 1 } );
	cells.push( { x: n.x - 1, y: n.y + 1 } );
	cells.push( { x: n.x + 1, y: n.y - 1 } );
	cells = cells.filter( function(cell) {
		return cell.x >= 0 && cell.x < BOARD_SIZE && cell.y >= 0 && cell.y < BOARD_SIZE;
	});

	return cells;
}

/**
 * Gets destination cells for appropriate piece color. 
 * @color PieceColor
 * @merge merges cells from two sides of the board into one list. Setting merge=false
 * return two sets of cells which is useful for path finding.
 */
Board.prototype.getDestinationCellCoordinates = function(color, merge=true) {
	var cells1 = [] 
	var cells2 = [] 
	if (color == PieceColor.RED) {
		for (var y = 0; y < BOARD_SIZE; y++)  {
			cells1.push( { x: 0, y: y } );	
			cells2.push( { x: BOARD_SIZE - 1, y: y } );	
		}
	}
	if (color == PieceColor.BLU) {
		for (var x = 0; x < BOARD_SIZE; x++)  {
			cells1.push( { x: x, y: 0 } );	
			cells2.push( { x: x, y: BOARD_SIZE - 1 } );	
		}
	}

	if (merge) {
		return cells1.concat(cells2);
	}
	return { lhs: cells1, rhs: cells2 };
}

function compareCoordinates(a, b) {
	return a.x == b.x && a.y == b.y;
}

/**
 * Finds path across the board for given piece color. DFS is performed only when
 * destination cells on both sides contain pieces of appropriate color.
 */ 
function findPath(board, color) {
	cells = board.getDestinationCellCoordinates(color, false);

	var lhs = cells.lhs.filter( cell => { return board.getCell(cell) == color } );
	var rhs = cells.rhs.filter( cell => { return board.getCell(cell) == color } );
	if (lhs.length != 0 && rhs.length != 0) {
		for (var i = 0; i < lhs.length; i++) {
			var path = dfs(board, lhs[i], rhs, color);
			if (path.length != 0) {
				return path;
			}
		}
	}

	return [];
}

/**
 * DFS procedure.
 */
function dfs(board, start_state, goal_states, color) {
	open_list = [];
	closed_list = [];

	open_list.push(start_state);
	previous_node = { };

	var state;
	while (open_list.length != 0) {
		state = open_list.pop();
		var successors = board.getNeighbours(state);

		// found the goal;
		var goals = goal_states.filter(e => { return compareCoordinates(e, state); });
		if (goals.length != 0) {
			return reconstructPath(state, previous_node);
		}

		for (var i = 0; i < successors.length; i++) {
			var succ = successors[i];
			var closed = closed_list.filter(e => { return compareCoordinates(e, succ); });
			if (board.getCell(succ) == color && closed.length == 0) {
				open_list.push(succ);
				previous_node[`${succ.x},${succ.y}`] = state;
			}
		}

		closed_list.push(state);
	}

	return [];
}

/**
 * Reconstruct path procedure.
 * @state: goal state discovered using DFS.
 * @previous_node: edges
 */
function reconstructPath(state, previous_node) {
	var path = [state];
	var elem = previous_node[`${state.x},${state.y}`];
	while (elem != null) {
		path.push(elem);	
		elem = previous_node[`${elem.x},${elem.y}`];
	}

	return path;
}

// TODO MAYBE REMOVE THIS LATER;
/**
 * Before calling contract, verify that path is valid with the same logic that 
 * runs in the contract.
 */ 
function pathToSolidityArray(board, path, color) {
	var temp = [];

	for (var i = 0; i < path.length; i++) {
		temp.push(path[i].x);
		temp.push(path[i].y);
	}

	if (!verifyPath(color, temp, board.board)) {
		throw "VALIDATION FAILED!";
	}

}


/**
 * Client-side implementation of placePieceAndCheckWinningCondition function. V
 */
function verifyPath(color, positions, gameField) {
	if (!checkValidPossiblePath(positions, color, gameField)) {
		console.log("checkValidPossiblePath");
		return false;
	}

	var px = positions[0];
	var py = positions[1];
	var idx = py * BOARD_SIZE + px;
	if (gameField[idx].color != color) {

		console.log("checkFirstElem");
		return false;	
	}

	for (var i = 2; i < positions.length; i+=2) {
		px = positions[i];
		py = positions[i+1];

		idx = py * BOARD_SIZE + px;
		if (!validPosition(px, py) || !neighbourOf(px, py, positions[i-2], positions[i-1]) || 
			 gameField[idx].color != color) {
			console.log("checkAllElems");
			return false;
		}
	}

	return true;
}


function checkValidPossiblePath(positions, color, gameField) {
	var is_valid = true;
	is_valid = is_valid && (positions.length > 0);
	is_Valid = is_valid && (positions.length % 2 == 0);
	is_Valid = is_valid && (compareTargetColor(positions[0], positions[1], color, gameField));
	is_Valid = is_valid && (compareTargetColor(positions[positions.length-2], positions[positions.length-1], color, gameField));

	if (color == PieceColor.BLU) {
		is_Valid = is_valid && (positions[1] == BOARD_SIZE-1 
			                 && positions[positions.length-1] == 0);
	}
	if (color == PieceColor.RED) {
		is_Valid = is_valid && (positions[0] == BOARD_SIZE-1 
			                 && positions[positions.length-2] == 0);
	}

	return is_valid;
}


/**
 * Duplicate of Contracts neighbourOf function.
 */
function neighbourOf(p1x, p1y, p2x, p2y) {
	if (comparePositions(p1x-1, p1y,   p2x, p2y)) return true; 
	if (comparePositions(p1x+1, p1y,   p2x, p2y)) return true; 
	if (comparePositions(p1x,   p1y-1, p2x, p2y)) return true; 
	if (comparePositions(p1x,   p1y+1, p2x, p2y)) return true; 
	if (comparePositions(p1x-1, p1y+1, p2x, p2y)) return true; 
	if (comparePositions(p1x+1, p1y-1, p2x, p2y)) return true; 
	return false;
}

function validPosition(p1x, p1y) {
	return (p1x >= 0 && p1x < BOARD_SIZE && p1y >= 0 && p1y < BOARD_SIZE);
}

function comparePositions(p1x, p1y, p2x, p2y) {
	return (p1x == p2x && p1y == p2y);
}

function compareTargetColor(x, y, color, gameField) {

	var idx = y * BOARD_SIZE + x;
	if (color == PieceColor.RED) {
		return (gameField[idx].type == CellType.REDTARGET 
			 || gameField[idx].type == CellType.ANYTARGET);
	}
	if (color == PieceColor.BLU) {
		return (gameField[idx].type == CellType.BLUTARGET 
			 || gameField[idx].type == CellType.ANYTARGET);
	}

	return false;
}
