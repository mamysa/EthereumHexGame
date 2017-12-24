/**
 * Listens to GameFactory contract events and creates local GameInstances as required if
 * user ids match.
 */
function GameInstanceManager(gameFactoryAddress) {
	this.gameFactory = loadContract(gameFactoryAddress, gameFactoryABI);
	this.gameInstanceMap = { };
	this.currentGameInstance = null;
}

/**
 * Reset when user switches wallets - the user may be participating in 
 * different games.
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
		console.log(result);
		var args = result.args;
		if (result.event == 'onPlayerWaiting') {
			console.log(args.waitingPlayer);
		}
		if (result.event == 'onGameInstanceCreated') {
			if (currentAccount == args.p1 || currentAccount == args.p2) {
				self.addGameInstance(args.gameInstance, args.p1, args.p2);
			}
		}
	});
}

/**
 * call startGame in GameFactory contract.
 */
GameInstanceManager.prototype.startGame = function() {
	//#console.log(currentAccount);
	var gasEstimate = this.gameFactory.startGame.estimateGas({from: currentAccount });
	this.gameFactory.startGame({ from: currentAccount, gas:gasEstimate }, function(err, result) {
		if (err) {
			console.err(err);
		}

		if (result) {
			console.log(result);
		}
	});
}

GameInstanceManager.prototype.addGameInstance = function(gameInstanceAddress, p1, p2) {
	if (!(gameInstanceAddress in this.gameInstanceMap)) { 
		var instance = new GameInstance(gameInstanceAddress, p1, p2);
		this.gameInstanceMap[gameInstanceAddress] = instance;

		// update view
		createTableEntry(gameInstanceAddress, p1, p2);
	}
}

GameInstanceManager.prototype.setCurrentGameInstance = function(gameAddress) {
	if (this.currentGameInstance != null)
		this.currentGameInstance.toBackground();
	this.currentGameInstance = this.gameInstanceMap[gameAddress];
	this.currentGameInstance.toForeground();
	this.currentGameInstance.draw();
}

GameInstanceManager.prototype.getCurrentGameInstance = function() {
	return this.currentGameInstance;
}
