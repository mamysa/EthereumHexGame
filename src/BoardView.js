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
			var y = posy + 260;

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

var svg;
function initializeView() {
	svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttributeNS(null,"id","svgDoc");
	svg.setAttributeNS(null,"height","80%");
	svg.setAttributeNS(null,"width","100%");

	document.getElementsByTagName('body')[0].appendChild(svg);

	var board = new Board();
	var boardSvg = getSVGBoard();
	svg.appendChild(boardSvg);
}


/**
 * click event handler
 */
function click(e) {
	var nums = this.id.split(',');
	var obj = { x: parseInt(nums[0]), y: parseInt(nums[1]) };

	var currentGameInstance = gameFactory.getCurrentGameInstance();
	if (currentGameInstance != null) {
		currentGameInstance.onBoardClick(obj);
	}
}

/**
 * updateView
 */
function updateView(loc, pieceColor) {
	var cell = document.getElementById(`${loc.x},${loc.y}`);
	var color = '#eaedf2';
	if (pieceColor == PieceColor.RED) color = "#bc492f"
	if (pieceColor == PieceColor.BLU) color = "#2f56bc"
	cell.setAttributeNS(null, 'fill', color);
}

function updateViewWinner(loc, pieceColor) {
	var cell = document.getElementById(`${loc.x},${loc.y}`);
	var color = '#eaedf2';
	if (pieceColor == PieceColor.RED) color = "#f7044d"
	if (pieceColor == PieceColor.BLU) color = "#051c82"
	cell.setAttributeNS(null, 'fill', color);
}

function resetView() {
	for (var y = 0; y < BOARD_SIZE; y++) 
	for (var x = 0; x < BOARD_SIZE; x++)  {
		var cell = document.getElementById(`${x},${y}`);
		cell.setAttributeNS(null, 'fill', '#eaedf2');
	}
}
