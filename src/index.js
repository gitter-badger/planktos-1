var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = 8000;

app.get('/', function(req, res){
    res.send('p2pweb root page');
});

io.on('connection', function(socket){
    console.log('new socket.io connection', data);
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});
