pragma solidity ^0.4.0;
contract GameFactory {

	struct GameInfo {
		bool    isset;
		address player1;
		address player2;
		address gameInstance;
	}

	address owner;
	bytes32 version;

	// player who is waiting for someone else call startGame()
	address awaitingPlayer;
	
	// currently active games
	mapping(address => GameInfo) public liveGames;

	

	function GameFactory(bytes32 _version) public {
		owner = msg.sender;
		version = _version;
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
			//TODO instantiate contract 
			address p1 = awaitingPlayer;
			address p2 = msg.sender;
			HexGameInstance game = new HexGameInstance(this, p1, p2);
			liveGames[p1] = GameInfo(true, p1, p2, game);
			liveGames[p2] = GameInfo(true, p1, p2, game);
			awaitingPlayer = address(0x0);
		}
	}

	function endGame(address gameInstance, address p1, address p2) checkEndGameCaller(gameInstance, p1, p2) public {
		delete liveGames[p1];
		delete liveGames[p2];
	}

	/**
	* Ensure that user is not already waiting / playing the game.
	*/
	modifier checkUser() {
		require(msg.sender != awaitingPlayer);
		require(!liveGames[msg.sender].isset);
		_;
	}

	modifier checkEndGameCaller(address gameInstance, address p1, address p2) {
		require(msg.sender == gameInstance);
		require(liveGames[p1].gameInstance == gameInstance);
		require(liveGames[p2].gameInstance == gameInstance);
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
		CellType cellType;
	}

	// parent contract that we will call once game is over.
	GameFactory parentContract;

	// mapping of player to piece color. Also store player addresses in separate array.
	mapping(address => PieceColor) public mappingPlayerColor;
	address[2] players;

	// index of the player who has the next turn. _player1 if 0, _player2 if 1 
	uint8 turn;

	// number of moves.
	uint moves;

	// game board
	Cell[11][11] public gameField;

	event onGameStarted(address gameInstance, address p1, address p2);
	event onGameEnded(address winner);
	event onPiecePlaced(uint x, uint y, PieceColor pieceColor);
	//event onPieceSwapped();
	
	function HexGameInstance(GameFactory _parentContract, address _player1, address _player2) public {
		parentContract = _parentContract;
		players[0] = _player1;
		players[1] = _player2;
		mappingPlayerColor[players[0]] = PieceColor.RED;
		mappingPlayerColor[players[1]] = PieceColor.BLU;
		onGameStarted(this, players[0], players[1]);
	}

	function placePiece(uint x, uint y, PieceColor color) checkValidMove(x, y, color) public {
		gameField[y][x].piece = color;
		// TODO check winning condition?
		nextMove();
		onPiecePlaced(x, y, color);
	}

	/*
	function swapPiece() checkValidSwap() {
		
	}
	*/

	// kill contract / display win-lose messages to involved parties. 
	// TODO in the future, we might make game entry payable?
	function endGame() public {
		onGameEnded(players[0]);
		parentContract.endGame(this, players[0], players[1]);
		selfdestruct(0x0);
	}

	// Increment move counter and give turn to the next player.
	function nextMove() private {
		moves += 1;
		turn = (turn + 1) % 2;
	}

	// (1) Ensure that move is made by the person we expect;
	// (2) Ensure that that person is not doing insertion outside the board.
	// (3) Ensure that person is using a piece color that we expect.
	modifier checkValidMove(uint x, uint y, PieceColor color) {
		require(msg.sender == players[turn]);
		require(x >= 0 && x < 11);
		require(y >= 0 && y < 11);
		require(mappingPlayerColor[msg.sender] == color);
		require(gameField[y][x].piece == PieceColor.NONE);
		_;
	}

	// (1) Ensure that move is made by the person that we expect;
	// (2) Ensure that swap move can be only made on the second move.
	modifier checkValidSwap() {
		require(msg.sender == players[turn]);
		require(moves == 1);
		_;
	}
}
