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

function backgroundRectangle(x, y, width, height, color) {
	var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	bg.setAttributeNS(null, 'x', `${x}`);
	bg.setAttributeNS(null, 'y', `${y}`);
	bg.setAttributeNS(null, 'width',   `${width}`);
	bg.setAttributeNS(null, 'height',  `${height}`);
	bg.setAttributeNS(null, 'fill',  color);
	return bg;
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

Board.prototype.getDestinationCellCoordinates = function(color, merge=true) {
	cells1 = [] 
	cells2 = [] 
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

function findPath(board, color) {
	cells = board.getDestinationCellCoordinates(color, false);

	// filter cells that contain pieces of color	
	var lhs = cells.lhs.filter( function(cell) { return board.getCell(cell) == color } );
	var rhs = cells.rhs.filter( function(cell) { return board.getCell(cell) == color } );
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

function dfs(board, start_state, goal_states, color) {
	open_list = [];
	closed_list = [];

	open_list.push(start_state);
	dict = { };


	var state;
	var path_found = false;
	while (open_list.length != 0) {
		state = open_list.pop();
		var successors = board.getNeighbours(state);

		
		// found the goal;
		if (goal_states.filter(e => { return e.x == state.x && e.y == state.y; } ).length != 0) {
			path_found = true;
			break;
		}

		successors.forEach(successor => {
			if (board.getCell(successor) == color) {
			// do not expand nodes previously visited nodes
				if (closed_list.filter(e => { return e.x == successor.x && e.y == successor.y; } ).length == 0) {
					open_list.push(successor);
					dict[`${successor.x},${successor.y}`] = state;
				}
			}
		});

		closed_list.push(state);
	}

	
	// reconstruct path.
	if (path_found) {
		var path = [state];
		var elem = dict[`${state.x},${state.y}`];
		while (elem != null) {
			path.push(elem);	
			elem = dict[`${elem.x},${elem.y}`];
		}
		return path;
	}

	return [];
}





// create drawable elements (in our case it is SVG). Map these elements
// to elements in board matrix.
function getSVGBoard() {
	var w = window.innerWidth;
	var h = window.innerHeight;
	var r = 25;

	// transforms
	var tx = w * 0.5;
	var ty = h * 0.001;
	var rx = 0;
	var ry = 10*1.75*r;


	// draw background
	var bg1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	bg1.setAttributeNS(null, 'x', '0');
	bg1.setAttributeNS(null, 'y', '0');
	bg1.setAttributeNS(null, 'width',   `${w*0.5}`);
	bg1.setAttributeNS(null, 'height',  `${10*1.75*r}`);
	bg1.setAttributeNS(null, 'fill',  'yellow');

	
	var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
	group.appendChild(backgroundRectangle(0,   -ry, tx, ry*2, '#ff9d8c'));
	group.appendChild(backgroundRectangle(-tx,  ry, tx, ry*2, '#ff9d8c'));
	group.appendChild(backgroundRectangle(-tx, -ry, tx, ry*2, '#8cebff'));
	group.appendChild(backgroundRectangle(0,    ry, tx, ry*2, '#8cebff'));
	
	var matrixDiagonalCol = 1;
	for (var row = 0; row < BOARD_SIZE+BOARD_SIZE-1; row++) {
		var cells = (row < BOARD_SIZE) ? row : (BOARD_SIZE+BOARD_SIZE - 2 - row)
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
			elem.setAttributeNS(null, 'fill', '#eaedf2');
			elem.setAttributeNS(null, 'stroke', 'black');
			elem.setAttributeNS(null, 'stroke-width', '3px');
			elem.id = `${matrixRow},${matrixCol}`;
			elem.addEventListener('click', click)
			group.appendChild(elem);

			matrixRow -= 1;
			matrixCol += 1;
		}
	}

	group.setAttributeNS(null,"transform",`rotate(90,${rx},${ry}) translate(${ty},-${tx}) `);
	//group.setAttributeNS(null,"transform",`translate(${tx},${ty}) `);
	return group;
}

function SVGBoardSetColor(x, y, pieceColor) {
	var cell = document.getElementById(`${y},${x}`);
	var color = '#eaedf2';
	if (pieceColor == PieceColor.RED) color = "#bc492f"
	if (pieceColor == PieceColor.BLU) color = "#2f56bc"
	cell.setAttributeNS(null, 'fill', color);
}
