if (typeof web3 !== 'undefined') {
	web3 = new Web3(web3.currentProvider);
}
else {
	web3 = new Web3( new Web3.providers.HttpProvider("http://localhost:8545") );
}

var currentAccount = '';

setInterval( function() {
	var account = web3.eth.accounts[0];
	if (currentAccount != account) {
		currentAccount = account;
		console.log(currentAccount);
		gameFactory.reset();
		resetView();
	}
}, 1000);


var gameFactory = new GameInstanceManager(gameFactoryAddress);




function onPlacePiecePressed() {
	var currentGameInstance = gameFactory.getCurrentGameInstance();
	if (currentGameInstance != null) {
		currentGameInstance.onPlacePieceClick();
	}
}

function onForfeitPressed() {
	var currentGameInstance = gameFactory.getCurrentGameInstance();
	if (currentGameInstance != null) {
		currentGameInstance.forfeit();
	}
}

function onOpenPressed() {
	gameFactory.setCurrentGameInstance(this.id);
}

function createTableEntry(gameAddress, player1, player2) {
	var tr = document.createElement('tr');	
	var td1 = document.createElement('td');
	var td2 = document.createElement('td');
	var td3 = document.createElement('td');
	var td4 = document.createElement('td');
	var button = document.createElement('button');
	button.classList.add('pure-button');
	button.classList.add('pure-button-primary');
	button.innerHTML = 'Open';
	button.addEventListener('click', onOpenPressed);
	button.id = gameAddress;
	td1.innerHTML = gameAddress;
	td2.innerHTML = player1;
	td3.innerHTML = player2;

	td4.appendChild(button);
	tr.appendChild(td1);
	tr.appendChild(td2);
	tr.appendChild(td3);
	tr.appendChild(td4);

	document.getElementById('table_body').appendChild(tr);
}




initializeView();
