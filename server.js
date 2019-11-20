'use strict'
const http = require('http');
const WebSocket = require('ws');

const server = http.createServer();

const wss = new WebSocket.Server({ server });

const subscribers = {};

function parseStore(key) {
	return key.split('-')[0];
}

function addSubscriber(key, request, ws) {
	let store = subscribers[parseStore(key)];
	if (store === undefined) {
		const storeList = {};
		subscribers[parseStore(key)] = { 'count': 0, 'storeList': storeList };
		store = subscribers[parseStore(key)];
	}

	store['storeList'][key] = {
		request,
		ws,
	};
}

function subscribeToEvents(ws, request) {
	const store = request.url.split('=')[1];
	const subscriberKey = store + '-' + Date.now();
	addSubscriber(subscriberKey, request, ws);
	const id = subscribers[parseStore(subscriberKey)].count;
	const eventData = 'id: ' + id + '\n' + 'data: This was the last id sent\n\n';
	ws.send(eventData);
}

function generateEvent(ws, request) {
	let param = request.url.split('=')[1];
	param = decodeURIComponent(param);
	const store = param.split('-')[0];
	const data = param.split('-')[1];
	let id;
	if (store != 'ALL') {
		id = ++subscribers[store]['count'];
	} else {
		id = -1;
	}
	const eventData = 'id: ' + id + '\n' + 'data: ' + data + '\n\n';
	if (store === "ALL") {
		for (const storeNumber in subscribers) {
			const storeList = subscribers[storeNumber]['storeList'];
			for (const key in storeList) {
				storeList[key].ws.send(eventData);
			}
		}
	} else {
		const storeList = subscribers[store]['storeList'];
		for (const key in storeList) {
			storeList[key].ws.send(eventData);
		}
	}
}

wss.on('connection', ((ws, request) => {
	const url = request.url.split('?');
	switch (url[0]) {
	case '/stream':
		subscribeToEvents(ws, request);
		break;
	case '/generateEvent':
		generateEvent(ws, request);
		break;
	default: break;
	}
}));

server.listen(process.env.PORT || 8999, () => {
	console.log(`Web socket server on port ${server.address().port}`);
});
