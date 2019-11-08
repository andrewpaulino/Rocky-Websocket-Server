const WebSocket = require("ws");
const utils = require("./utils.js");
var clients = {};
var gameSessions = {};

const wss = new WebSocket.Server({ port: 8080 });
console.log("Websocket Server Running on port 8080");
wss.on("connection", function connection(ws, req) {
  console.log(req.connection.remoteAddress);
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
  });

  ws.send("something");
});
