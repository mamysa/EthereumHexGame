pragma solidity ^0.4.0;
contract GameFactory {

	address owner;

	struct GameInfo {
		bool    isset;
		address player1;
		address player2;
		address gameInstance;
	}


	// mapping player -> gameinfo mapping.

	// player who is waiting for someone else call startGame()
	address awaitingPlayer;
	
	// currently active games
	mapping(address => GameInfo) public gameInstances;

	event onGameInstanceCreated(address gameInstance, address p1, address p2);
	event onGameInstanceDestroyed(address gameInstance, address p1, address p2);

	function GameFactory() public {
		owner = msg.sender;
		awaitingPlayer = address(0x0);
	}

	// If address of awaitingPlayer is 0, store msg.sender there.
	// Otherwise, initialize GameInfo structure, store GameInfo into the mapping, and
	// initialize game instance. 
	// In this case, we have to ensure that 
	// (1) msg.sender != awaitingPlayer; and
	// (2) liveGames[msg.sender] key exists (i.e. fields of the struct are 0)
	function startGame() checkUser() public {
		if (awaitingPlayer == address(0x0)) {
			awaitingPlayer = msg.sender;
		}
		else {
			address p1 = awaitingPlayer; 
			address p2 = msg.sender;
			HexGameInstance game = new HexGameInstance(this, p1, p2);
			GameInfo memory info = GameInfo(true, p1, p2, game);
			gameInstances[p1] = info; gameInstances[p2] = info; 
			awaitingPlayer = address(0x0);
			onGameInstanceCreated(game, p1, p2);
		}
	}

	function endGame(address gameInstance, address p1, address p2) checkEndGameCaller(gameInstance, p1, p2) public {
		onGameInstanceDestroyed(gameInstance, p1, p2);
		delete gameInstances[p1];
		delete gameInstances[p2];
	}

	/*
	 * Ensure that user is not already waiting / playing the game.
	 */
	modifier checkUser() {
		require(!gameInstances[msg.sender].isset);
		require(msg.sender != awaitingPlayer);
		_;
	}

	/*
	 * Verify that game can only be ended by someone that we expect.
	 */
	modifier checkEndGameCaller(address gameInstance, address p1, address p2) {
		require(msg.sender == gameInstance);
		require(gameInstances[p1].gameInstance == gameInstance);
		require(gameInstances[p2].gameInstance == gameInstance);
		_;
	}
}


contract HexGameInstance {
	
	enum PieceColor { RED, BLU, NONE }
	enum CellType { ALL, REDTARGET, BLUTARGET, ANYTARGET }

	// Represents cell of the game field. 
	// TODO CellType?
	//It can be occupied by a piece of some color (i.e. PieceColor.RED, PieceColor.BLU).
	//It can also be empty (i.e. PieceColor.NONE)
	struct Cell {
		PieceColor piece;
		CellType target;
	}

	// parent contract that we will call once game is over.
	GameFactory parentContract;

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
	event onPiecePlaced(uint x, uint y, PieceColor pieceColor, address player, uint movenum);
	event onPieceSwapped(uint movenum);
	
	function HexGameInstance(GameFactory _parentContract, address _player1, address _player2) public {
		parentContract = _parentContract;
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

	function placePiece(uint x, uint y, PieceColor color, uint movenum) checkValidPiecePlacement(x, y, color, movenum) public {
		gameField[y][x].piece = color;
		onPiecePlaced(x, y, color, msg.sender, moveNumber);
		nextMove();
	}

	function placePieceAndCheckWinningCondition(uint x, uint y, PieceColor color, uint movenum, uint[] positions) 
	checkValidPiecePlacement(x, y, color, movenum) 
	checkValidPossiblePath(positions, color)
	public {
		placePiece(x, y, color, movenum);

		uint px = positions[0];
		uint py = positions[1];
		if (gameField[py][px].piece != color) {
			// TODO what do we do here?		

		}

		for (uint i = 2; i < positions.length; i+=2) {
			px = positions[i];
			py = positions[i+1];

			if (!validPosition(px, py) || !neighbourOf(px, py, positions[i-2], positions[i-1]) || 
			     gameField[py][px].piece != color) {
				// TODO game over?	
			}
		}
	}

	function swapPieceColor(uint movenum) checkValidSwap(movenum) public {
		playerColor[players[0]] = PieceColor.BLU;
		playerColor[players[1]] = PieceColor.RED;
		onPieceSwapped(moveNumber);
		nextMove();
	}

	// kill contract / display win-lose messages to involved parties. 
	function endGame() public {
		onGameEnded(players[0]);
		//parentContract.endGame(this, players[0], players[1]);
		selfdestruct(0x0);
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
	 * Returns true if piece color matches target color.
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
