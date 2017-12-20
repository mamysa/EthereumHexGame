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
