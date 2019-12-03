var clients = {};
var gameSessions = {};
var WebSocketServer = require('ws').Server;
var http = require('http');
var express = require('express');
var _utils = require('./utils.js');
var uuidv4 = require('uuid/v4');
var app = express();
var port = process.env.PORT || 5000;

app.use(express.static(__dirname + '/'));

var server = http.createServer(app);
server.listen(port);

console.log('http server listening on %d', port);

var wss = new WebSocketServer({ server: server });
console.log('websocket server created');

wss.on('connection', function(ws) {
    let id = uuidv4();
    clients[id] = ws;
    ws.on('message', function(message) {
        switch (message.match(/<(.*?)>/)[1]) {
            case 'new':
                intializeNewGame(id);
                break;
            case 'connect':
                connectPlayerToGame(message.match(/\(([^)]+)\)/)[1], id);
                break;
            case 'movePlayer1':
                registerMove(
                    message.substr(message.indexOf('[') + 1, message.indexOf(']') - message.indexOf('[') - 1),
                    1,
                    message.substr(message.indexOf('{') + 1, message.indexOf('}') - message.indexOf('{') - 1),
                    message.substr(message.indexOf('(') + 1, message.indexOf(')') - message.indexOf('(') - 1)
                );
                break;
            case 'movePlayer2':
                registerMove(
                    message.substr(message.indexOf('[') + 1, message.indexOf(']') - message.indexOf('[') - 1),
                    2,
                    message.substr(message.indexOf('{') + 1, message.indexOf('}') - message.indexOf('{') - 1),
                    message.substr(message.indexOf('(') + 1, message.indexOf(')') - message.indexOf('(') - 1)
                );
                break;
            default:
                console.log('NOT FOUND');
        }
    });

    console.log('websocket connection open');

    ws.on('close', function() {
        console.log('websocket connection close');
        clearInterval(id);
    });
});

function registerMove(gameCode, clientNumber, movement, isHit) {
    const session = gameSessions[gameCode];
    console.log(session);
    if (clientNumber === 1) {
        if (isHit) {
            session.healthPlayerTwo -= 25;
        }
        clients[session.clientTwo].send(`<update_movement> (playerOne) {${movement}} ~${session.healthPlayerTwo}~`);
    } else {
        if (isHit) {
            session.healthPlayerOne -= 25;
        }
        clients[session.clientOne].send(`<update_movement> (playerTwo) {${movement}} ~${session.healthPlayerOne}~`);
    }
}

function intializeNewGame(id) {
    let gameCode = _utils.getRandomFourNumbers();
    gameSessions[gameCode] = {
        clientOne: id,
        clientTwo: 'waiting',
        healthPlayerOne: 100,
        healthPlayerTwo: 100
    };
    clients[id].send(`<gamecode> (${gameCode})`);
    console.log(`New Game Session Created By, UserUUID: ${id} With Code of ${gameCode}`);
}

function connectPlayerToGame(gameCode, clientTwoId) {
    const currentSession = gameSessions[gameCode];
    currentSession.clientTwo = clientTwoId;
    clients[currentSession.clientTwo].send(`<game> (start) [${gameCode}]`);
    clients[currentSession.clientOne].send(`<game> (start) [${gameCode}]`);
}

//Schema:
//<clientNumber> [gameCode] {movement} (collisionDetected) **if collison detect opposite client health depleted;

//<movePlayer1> [gameCode] {right_3} (false)
