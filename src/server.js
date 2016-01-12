var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = 8000;

var boards = {};
var blocks = {};

app.use(express.static(__dirname + '/../www'));

io.on('connection', function(socket){

    socket.on('pullBlockHashes', function(data) {
        console.log('pullBlockHashes', data);
        var resp = {
          'hashes': data.board in boards ? boards[data.board] : [],
          'id': data.id
        }
        socket.emit('onPulledBlockHashes', resp);
    });

    socket.on('pullBlock', function(data) {
        console.log("pullBlock", data);
        var resp = {
          'block': blocks[data.hash],
          'id': data.id
        };
        socket.emit('onPulledBlock', resp);
    });

    socket.on('pushBlock', function(data) {
        console.log("pushBlock", data);
        if (!(data.board in boards))
            boards[data.board] = [];
        boards[data.board].push(data.block.hash);
        blocks[data.block.hash] = data.block;
        socket.emit('onPushedBlock', {"id": data.id});
    });

});

http.listen(port, function(){
    console.log('listening on *:' + port);
});
