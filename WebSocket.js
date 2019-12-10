var clients = {};
var gameSessions = {};
var WebSocketServer = require("ws").Server;
var http = require("http");
var express = require("express");
var _utils = require("./utils.js");
var uuidv4 = require("uuid/v4");
var app = express();
var port = process.env.PORT || 5000;

app.use(express.static(__dirname + "/"));

var server = http.createServer(app);
server.listen(port);

console.log("http server listening on %d", port);

var wss = new WebSocketServer({ server: server });
console.log("websocket server created");

wss.on("connection", function(ws) {
  let id = uuidv4();
  clients[id] = ws;
  ws.on("message", function(message) {
    console.log("Recieving message: " + message);
    switch (message.match(/<(.*?)>/)[1]) {
      case "new":
        initializeNewGame(id);
        break;
      case "connect":
        connectPlayerToGame(message.match(/\(([^)]+)\)/)[1], id);
        break;
      case "movePlayer1":
        registerMove(
          message.substr(
            message.indexOf("[") + 1,
            message.indexOf("]") - message.indexOf("[") - 1
          ),
          1,
          message.substr(
            message.indexOf("{") + 1,
            message.indexOf("}") - message.indexOf("{") - 1
          ),
          message.substr(
            message.indexOf("(") + 1,
            message.indexOf(")") - message.indexOf("(") - 1
          )
        );
        break;
      case "game_ended":
        registerGameEnded(
          message.substr(
            message.indexOf("[") + 1,
            message.indexOf("]") - message.indexOf("[") - 1
          ),
          message.substr(
            message.indexOf("(") + 1,
            message.indexOf(")") - message.indexOf("(") - 1
          )
        );
        break;
      case "movePlayer2":
        registerMove(
          message.substr(
            message.indexOf("[") + 1,
            message.indexOf("]") - message.indexOf("[") - 1
          ),
          2,
          message.substr(
            message.indexOf("{") + 1,
            message.indexOf("}") - message.indexOf("{") - 1
          ),
          message.substr(
            message.indexOf("(") + 1,
            message.indexOf(")") - message.indexOf("(") - 1
          )
        );
        break;
      case "hit":
        registerHealth(
          message.substr(
            message.indexOf("[") + 1,
            message.indexOf("]") - message.indexOf("[") - 1
          ),
          message.substr(
            message.indexOf("{") + 1,
            message.indexOf("}") - message.indexOf("{") - 1
          ),
          message.substr(
            message.indexOf("(") + 1,
            message.indexOf(")") - message.indexOf("(") - 1
          )
        );
      default:
        console.log("NOT FOUND");
    }
  });

  console.log("websocket connection open");

  ws.on("close", function() {
    console.log("websocket connection close");
    clearInterval(id);
  });
});
function registerGameEnded(gameCode, playerNum) {
  game = gameSessions[gameCode];
  let dude;
  if (playerNum == 1) {
    dude = "playerOne";
  }
  if (playerNum == 2) {
    dude = "playerTwo";
  }
  clients[game.clientOne].send(`<game_ended> (${dude})`);
  clients[game.clientTwo].send(`<game_ended> (${dude})`);
}
function registerHealth(gameCode, amtOfHealth, playerNum) {
  console.log(
    `HIT on player number ${playerNum} taking off ${amtOfHealth} from HP`
  );
  const session = gameSessions[gameCode];

  if (playerNum === "1") {
    session.healthPlayerOne -= 5;
    clients[session.clientOne].send(
      `<update_health> (playerOne) {${session.healthPlayerOne}}`
    );
    clients[session.clientTwo].send(
      `<update_health> (playerTwo) {${session.healthPlayerOne}}`
    );
  }

  if (playerNum === "2") {
    session.healthPlayerTwo -= 5;
    clients[session.clientOne].send(
      `<update_health> (playerTwo) {${session.healthPlayerTwo}}`
    );
    clients[session.clientTwo].send(
      `<update_health> (playerOne) {${session.healthPlayerTwo}}`
    );
  }
}
function registerMove(gameCode, clientNumber, movement, isHit) {
  console.log(
    `Registering Move For Gamecode: ${gameCode} for player ${clientNumber} with the movement of ${movement}`
  );
  const session = gameSessions[gameCode];
  console.log(session);
  if (clientNumber === 1) {
    clients[session.clientTwo].send(
      `<update_movement> (playerOne) {${movement}} [${isHit}]`
    );
  } else {
    clients[session.clientOne].send(
      `<update_movement> (playerTwo) {${movement}} [${isHit}]`
    );
  }
}

function initializeNewGame(id) {
  let gameCode = _utils.getRandomFourNumbers();
  gameSessions[gameCode] = {
    clientOne: id,
    clientTwo: "waiting",
    healthPlayerOne: 100,
    healthPlayerTwo: 100,
  };
  clients[id].send(`<gamecode> (${gameCode})`);
  console.log(
    `New Game Session Created By, UserUUID: ${id} With Code of ${gameCode}`
  );
}

function connectPlayerToGame(gameCode, clientTwoId) {
  try {
    const currentSession = gameSessions[gameCode];
    currentSession.clientTwo = clientTwoId;
    clients[currentSession.clientTwo].send(`<game> {start} [${gameCode}]`);
    clients[currentSession.clientOne].send(`<game> {start} [${gameCode}]`);
  } catch (err) {
    clients.send[clientTwoId].send("Sorry, couldn't find a game with that ID");
  }
}

//Schema:
//<clientNumber> [gameCode] {movement} (collisionDetected) **if collison detect opposite client health depleted;

//<movePlayer1> [gameCode] {right_3} (false)
