pragma solidity ^0.4.0;
contract GameFactory {

	address owner;

	// player who is waiting for someone else call startGame()
	address waitingPlayer;

	event onGameInstanceCreated(address gameInstance, address p1, address p2);

	function GameFactory() public {
		owner = msg.sender;
		waitingPlayer = address(0x0);
	}

	// If address of awaitingPlayer is 0, store msg.sender there.
	// Otherwise, initialize GameInfo structure, store GameInfo into the mapping, and
	// initialize game instance. 
	// In this case, we have to ensure that 
	// (1) msg.sender != awaitingPlayer; and
	// (2) liveGames[msg.sender] key exists (i.e. fields of the struct are 0)
	function startGame() checkNotWaitingPlayer() public {
		if (waitingPlayer == address(0x0)) {
			waitingPlayer = msg.sender;
		}
		else {
			address p1 = waitingPlayer; 
			address p2 = msg.sender;
			waitingPlayer = address(0x0);
			HexGameInstance game = new HexGameInstance(p1, p2);
			onGameInstanceCreated(game, p1, p2);
		}
	}

	/*
	 * Ensure that user is not already waiting / playing the game.
	 */
	modifier checkNotWaitingPlayer() {
		require(msg.sender != waitingPlayer);
		_;
	}
}

contract HexGameInstance {
	
	enum PieceColor { RED, BLU, NONE }
	enum CellType { ALL, REDTARGET, BLUTARGET, ANYTARGET }

	// Represents cell of the game field. 
	// It can be occupied by a piece of some color (i.e. PieceColor.RED, PieceColor.BLU).
	// It can also be empty (i.e. PieceColor.NONE)
	struct Cell {
		PieceColor piece;
		CellType target;
	}

	// mapping of player to piece color. Also store player addresses in separate array.
	mapping(address => PieceColor) public playerColor;
	address[2] players;

	// index of the player who has the next turn. _player1 if 0, _player2 if 1 
	uint8 turn;

	// number of moves.
	uint moveNumber;

	uint constant BOARD_SIZE = 11;

	// game board
	Cell[BOARD_SIZE][BOARD_SIZE] public gameField;

	event onGameStarted(address gameInstance, address p1, PieceColor p1color, address p2, PieceColor p2color);
	event onGameEnded(address winner);
	event onGameEndedBadWinningPath(address winner);
	event onPiecePlaced(uint x, uint y, PieceColor pieceColor, address player, uint movenum);
	event onPieceSwapped(uint movenum);
	
	function HexGameInstance(address _player1, address _player2) public {
		players[0] = _player1; playerColor[players[0]] = PieceColor.RED;
		players[1] = _player2; playerColor[players[1]] = PieceColor.BLU;
		
		uint x;
		uint y;
		uint b = BOARD_SIZE - 1;

		// initialize cells.
		for (y = 0; y < BOARD_SIZE; y++) 
		for (x = 0; x < BOARD_SIZE; x++)  {
			gameField[y][x] = Cell(PieceColor.NONE, CellType.ALL);
		}

		// blue targets are oriented horizontally.
		for (x = 0; x < BOARD_SIZE; x++) {
			gameField[0][x].target = CellType.BLUTARGET;
			gameField[b][x].target = CellType.BLUTARGET;
		}

		// red targets are oriented vertically.
		for (y = 0; y < BOARD_SIZE; y++) {
			gameField[y][0].target = CellType.REDTARGET;
			gameField[y][b].target = CellType.REDTARGET;
		}

		// set corners of the board as target for any player
		gameField[0][0].target = CellType.ANYTARGET;
		gameField[0][b].target = CellType.ANYTARGET;
		gameField[b][0].target = CellType.ANYTARGET;
		gameField[b][b].target = CellType.ANYTARGET;

		onGameStarted(this, players[0], playerColor[players[0]], 
					        players[1], playerColor[players[1]]);
	}

	/**
	 * Place piece of given color at given (x,y) coordinates.
	 */
	function placePiece(uint x, uint y, PieceColor color, uint movenum) checkValidPiecePlacement(x, y, color, movenum) public {
		gameField[y][x].piece = color;
		onPiecePlaced(x, y, color, msg.sender, moveNumber);
		nextMove();
	}

	/**
	 * This function is called only when we are sure a player has winning path.
	 * Such path is expected to be laid out in a very specific way. 
	 * positions array stores cell positions, where positions[i] is x and positions[i+1] is y.
	 * (1) Must start and begin with REDTARGET or ANYTARGET.
	 * (2) Since RED targets are oriented vertically, position[0] is expected to be BOARD_SIZE-1
	 * and position[position.length-2] is expected to be 0. Same goes for BLU pieces, only for the y axis.
	 * (3) All cells are expected to have valid coordinates.
	 * (4) All cells are expected to be of appropriate color.
	 * (5) All cells are expected to have neighbours that make reaching goal state possible.
	 * If any of these conditions fail, we end the game, assume that message sender is trying to cheat and let the other
	 * player win.
	 */
	function placePieceAndCheckWinningCondition(uint x, uint y, PieceColor color, uint movenum, uint[] positions) 
	checkValidPiecePlacement(x, y, color, movenum) 
	checkValidPossiblePath(positions, color)
	public {
		placePiece(x, y, color, movenum);

		uint px = positions[0];
		uint py = positions[1];
		if (gameField[py][px].piece != color || !validPosition(px, py)) {
			onGameEndedBadWinningPath(players[turn]);
			selfdestruct(players[turn]);
			return;
		}

		for (uint i = 2; i < positions.length; i+=2) {
			px = positions[i];
			py = positions[i+1];

			if (!validPosition(px, py) ||  !neighbourOf(px, py, positions[i-2], positions[i-1]) || gameField[py][px].piece != color) {
				onGameEndedBadWinningPath(players[turn]);
				selfdestruct(players[turn]);
				return;
			}
		}

		// otherwise player wins the game
		onGameEnded(msg.sender);	
		selfdestruct(msg.sender);
	}

	function swapPieceColor(uint movenum) checkValidSwap(movenum) public {
		playerColor[players[0]] = PieceColor.BLU;
		playerColor[players[1]] = PieceColor.RED;
		onPieceSwapped(moveNumber);
		nextMove();
	}

	/**
	 * Kill contract. If player chooses to end game, he loses the game. 
	 */
	function endGame() checkEndGame() public {
		uint8 n = (turn + 1) % 2;
		onGameEnded(players[n]);
		selfdestruct(players[n]);
	}

	// Increment move counter and give turn to the next player.
	function nextMove() private {
		moveNumber += 1;
		turn = (uint8)(moveNumber % 2);
	}

	// (1) Ensure that move is made by the person we expect;
	// (2) Ensure that that person is not doing insertion outside the board.
	// (3) Ensure that person is using a piece color that we expect.
	modifier checkValidPiecePlacement(uint x, uint y, PieceColor color, uint movenum) {
		require(moveNumber == movenum);
		require(msg.sender == players[turn]);
		require(x >= 0 && x < BOARD_SIZE);
		require(y >= 0 && y < BOARD_SIZE);
		require(playerColor[msg.sender] == color);
		require(gameField[y][x].piece == PieceColor.NONE);
		_;
	}

	// (1) Ensure that move is made by the person that we expect;
	// (2) Ensure that swap move can be only made on the second move.
	modifier checkValidSwap(uint movenum) {
		require(msg.sender == players[turn]);
		require(moveNumber == 1);
		require(movenum == moveNumber);
		_;
	}

	/**
	 * Ensure that first and last elements of the path are appropriate targets. 
	 * positions array is expected to have length greater than 0 and have even number elements, 2 per cell coordinate.
	 * Red targets are oriented vertically, so any x is valid but only y = 0 and y = 10 are valid.
	 * Blu targets are oriented horizontally, so only x = 0 and x = 10 are valid and any y is valid.
	 */
	modifier checkValidPossiblePath(uint[] positions, PieceColor color) {
		require(positions.length > 0);
		require(positions.length % 2 == 0);
		require(compareTargetColor(positions[0], positions[1], color));
		require(compareTargetColor(positions[positions.length-2], positions[positions.length-1], color));

		if (color == PieceColor.BLU) {
			require(positions[1] == BOARD_SIZE-1 && positions[positions.length-1] == 0);
		}
		if (color == PieceColor.RED) {
			require(positions[0] == BOARD_SIZE-1 && positions[positions.length-2] == 0);
		}
		_;
	}

	/**
	 * Ensure than game is being ended by one of the players.
	 */
	modifier checkEndGame() {
		require(msg.sender == players[turn] || msg.sender == players[(turn+1) % 2]);
		_;
	}

	/**
	 * Return true if p1 is a neighbour of p2. p2 should be a valid cell position.
	 */ 
	function neighbourOf(uint p1x, uint p1y, uint p2x, uint p2y) private pure returns (bool) {
		if (comparePositions(p1x-1, p1y,   p2x, p2y)) return true; 
		if (comparePositions(p1x+1, p1y,   p2x, p2y)) return true; 
		if (comparePositions(p1x,   p1y-1, p2x, p2y)) return true; 
		if (comparePositions(p1x,   p1y+1, p2x, p2y)) return true; 
		if (comparePositions(p1x-1, p1y+1, p2x, p2y)) return true; 
		if (comparePositions(p1x+1, p1y-1, p2x, p2y)) return true; 
		return false;
	}

	/**
	 * check if given Position is inside the board.
	 */ 
	function validPosition(uint p1x, uint p1y) private pure returns (bool) {
		return (p1x >= 0 && p1x < BOARD_SIZE && p1y >= 0 && p1y < BOARD_SIZE);
	}

	/**
	 * Position comparison function.
	 */
	function comparePositions(uint p1x, uint p1y, uint p2x, uint p2y) private pure returns (bool) {
		return (p1x == p2x && p1y == p2y);
	}

	/**
	 * Returns true if piece color matches target color for some cell (x,y).
	 */
	function compareTargetColor(uint x, uint y, PieceColor color) private view returns (bool) {
		if (color == PieceColor.RED) {
			return (gameField[y][x].target == CellType.REDTARGET 
				 || gameField[y][x].target == CellType.ANYTARGET);
		}
		if (color == PieceColor.BLU) {
			return (gameField[y][x].target == CellType.BLUTARGET 
				 || gameField[y][x].target == CellType.ANYTARGET);
		}

		return false;
	}
}
