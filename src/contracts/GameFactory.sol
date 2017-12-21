pragma solidity ^0.4.17;
contract GameFactory {

	address owner;

	// player who is waiting for someone else call startGame()
	address public waitingPlayer;

	event onGameInstanceCreated(address gameInstance, address p1, address p2);
	event onPlayerWaiting(address waitingPlayer);


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
			onPlayerWaiting(waitingPlayer);
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
	
	enum PieceColor { UNOCCUPIED, RED, BLU }
	enum CellType { ALL, REDTARGET, BLUTARGET, ANYTARGET }

	// mapping of player to piece color. Also store player addresses in separate array.
	mapping(address => PieceColor) public playerColor;

	// list of players
	address[2] public players;

	// game board mapping
	mapping (uint => mapping(uint => PieceColor)) public board;

	// game board dimensions
	uint constant BOARD_SIZE = 11;

	// index of the player who has the next turn. _player1 if 0, _player2 if 1 
	uint8 turn;

	// number of moves.
	uint moveNumber;

	// all possible events that can be triggered.
	event onGameStarted(address gameInstance, address p1, PieceColor p1color, address p2, PieceColor p2color);
	event onGameEnded(address winner);
	event onGameEndedBadWinningPath(address winner);
	event onPiecePlaced(uint x, uint y, PieceColor pieceColor, address player, uint movenum);
	event onPieceSwapped(uint movenum);
	

//==============================
// Constructor . 
//==============================

	function HexGameInstance(address _player1, address _player2) public {
		players[0] = _player1; playerColor[players[0]] = PieceColor.RED;
		players[1] = _player2; playerColor[players[1]] = PieceColor.BLU;
		
		onGameStarted(this, players[0], playerColor[players[0]], 
					        players[1], playerColor[players[1]]);
	}

//==============================
// General purpose board queries. 
//==============================

	// Return the celltype.
	// For BLU targets are oriented horizontally, so we only only care about y coordinate, any x is valid.
	// For RED targets are oriented vertically , so we only only care about x coordinate, any y is valid.
	//  Corners are marked as ANYTARGET
	function getCellType(uint x, uint y) public pure returns (CellType) {
		uint b = BOARD_SIZE - 1;
		if (x == 0 && y == 0) return CellType.ANYTARGET;
		if (x == b && y == 0) return CellType.ANYTARGET;
		if (x == 0 && y == b) return CellType.ANYTARGET;
		if (x == b && y == b) return CellType.ANYTARGET;
		if (y == 0 || y == b) return CellType.BLUTARGET;
		if (x == 0 || x == b) return CellType.REDTARGET;
		return CellType.ANYTARGET;
	}

	// Return cell's occupying piece color.
	function getPieceColor(uint x, uint y) public view returns (PieceColor) {
		return board[y][x];
	}

	// Return true if coordinate is inside the board.
	function validCellPosition(uint x, uint y) public pure returns (bool) {
		return (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE);
	}

	// Position comparison func
	function comparePositions(uint p1x, uint p1y, 
	                          uint p2x, uint p2y) public pure returns (bool) {
		return (p1x == p2x && p1y == p2y);
	}

	// Return true if p1 is a neighbour of p2. p2 is expected to be a valid cell position. 
	function neighbourOf(uint p1x, uint p1y, uint p2x, uint p2y) public pure returns (bool) {
		if (comparePositions(p1x-1, p1y,   p2x, p2y)) return true; 
		if (comparePositions(p1x+1, p1y,   p2x, p2y)) return true; 
		if (comparePositions(p1x,   p1y-1, p2x, p2y)) return true; 
		if (comparePositions(p1x,   p1y+1, p2x, p2y)) return true; 
		if (comparePositions(p1x-1, p1y+1, p2x, p2y)) return true; 
		if (comparePositions(p1x+1, p1y-1, p2x, p2y)) return true; 
		return false;
	}
	
	// Return true if a given cell is a target for a given piece color. 
	function isTargetForColor(uint x, uint y, PieceColor color) public pure returns (bool) {
		CellType t = getCellType(x, y);
		if (color == PieceColor.RED) return (t == CellType.REDTARGET || t == CellType.ANYTARGET);
		if (color == PieceColor.BLU) return (t == CellType.BLUTARGET || t == CellType.ANYTARGET);
		return false;
	}

//==============================
// placePiece Implementation.
//==============================

	// Place piece of given color at given (x,y) coordinate. Call requireValidPlacement first.
	function placePiece(uint x, uint y, PieceColor color, uint movenum) 
	checkPiecePlacement(x, y, color, movenum) public {
		board[y][x] = color;
		onPiecePlaced(x, y, color, msg.sender, moveNumber);
		nextMove();
	}

	// (1) Ensure that move is made by the person we expect;
	// (2) Ensure that that person is not doing insertion outside the board.
	// (3) Ensure that person is using a piece color that we expect.
	modifier checkPiecePlacement(uint x, uint y, PieceColor color, uint movenum) {
		require(movenum == moveNumber);
		require(msg.sender == players[turn] && playerColor[msg.sender] == color);
		require(validCellPosition(x, y) && getPieceColor(x, y) == PieceColor.UNOCCUPIED);
		_;
	}

//==============================
// placePieceAndCheckWinningCondition Implementation.
//==============================
	// This function is called only when we are sure a player has winning path.
	// Such path is expected to be laid out in a very specific way. 
	// positions array stores cell positions, where positions[i] is x and positions[i+1] is y.
	// (1) Must start and begin with REDTARGET or ANYTARGET.
	// (2) Since RED targets are oriented vertically, position[0] is expected to be BOARD_SIZE-1
	// and position[position.length-2] is expected to be 0. Same goes for BLU pieces, only for the y axis.
	// (3) All cells are expected to have valid coordinates.
	// (4) All cells are expected to be of appropriate color.
	// (5) All cells are expected to have neighbours that make reaching goal state possible.
	// If any of these conditions fail, we end the game, assume that message sender is trying to cheat and let the other
	// player win.
	function placePieceAndCheckPath(uint x, uint y, 
	                                PieceColor color, uint movenum, uint[] positions) 
	checkPiecePlacement(x, y, color, movenum) 
	checkPathPreconditions(positions, color)
	public {
		placePiece(x, y, color, movenum);

		uint px = positions[0];
		uint py = positions[1];
		if (!validCellPosition(px, py) || getPieceColor(px, py) != color) {
			onGameEndedBadWinningPath(players[turn]);
			selfdestruct(players[turn]);
			return;
		}

		for (uint i = 2; i < positions.length; i+=2) {
			px = positions[i];
			py = positions[i+1];

			if (!validCellPosition(px, py) || !neighbourOf(px, py, positions[i-2], positions[i-1]) || getPieceColor(px,py) != color) {
				onGameEndedBadWinningPath(players[turn]);
				selfdestruct(players[turn]);
				return;
			}
		}

		// otherwise player wins the game
		onGameEnded(msg.sender);	
		selfdestruct(msg.sender);
	}

	// Positions array is expected to have length greater than 0 and have even number elements, 
	// 2 per cell coordinate.
	// Ensure that first and last elements of the path are appropriate targets. 
	// Ensure first and last elements are valid cell positions and are targets of appropriate color.
	modifier checkPathPreconditions(uint[] positions, PieceColor color) {
		require(positions.length > 0 && positions.length % 2 == 0);
		require(validCellPosition(positions[0], positions[1]));
		require(validCellPosition(positions[positions.length-2], positions[positions.length-1]));
		require(isTargetForColor(positions[0], positions[1], color));
		require(isTargetForColor(positions[positions.length-2], positions[positions.length-1], color));
		if (color == PieceColor.BLU) {
			require(positions[1] == BOARD_SIZE-1 && positions[positions.length-1] == 0);
		}
		if (color == PieceColor.RED) {
			require(positions[0] == BOARD_SIZE-1 && positions[positions.length-2] == 0);
		}
		_;
	}
	
//==============================
// swapPiececolor Implementation.
//==============================

	// When the second player makes the first move, he can instead choose to swap pieces with 
	// opponent.
	function swapPieceColor(uint movenum) checkSwapPreconditions(movenum) public {
		playerColor[players[0]] = PieceColor.BLU;
		playerColor[players[1]] = PieceColor.RED;
		onPieceSwapped(moveNumber);
		nextMove();
	}

	// (1) Ensure that move is made by the person that we expect;
	// (2) Ensure that swap move can be only made on the second move.
	modifier checkSwapPreconditions(uint movenum) {
		require(msg.sender == players[turn]);
		require(moveNumber == 1);
		require(movenum == moveNumber);
		_;
	}

//==============================
// endGame Implementation.
//==============================

	// Kill contract. Caller forfeits and loses the game. 
	function endGame() checkAuthorizedEndGameSender() public {
		uint8 n = (turn + 1) % 2;
		onGameEnded(players[n]);
		selfdestruct(players[n]);
	}

	// Ensure than game is being ended by one of the participants.
	modifier checkAuthorizedEndGameSender() {
		require(msg.sender == players[turn] || msg.sender == players[(turn+1) % 2]);
		_;
	}

//==============================
// nextMove Implementation.
//==============================

	// Increment move counter and give turn to the next player.
	function nextMove() private {
		moveNumber += 1;
		turn = (uint8)(moveNumber % 2);
	}
}
