var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = 8000;

var blockStructure = {
  "main": {
    "index.html": {},
    "comments": {
      "1": {},
      "2": {}
    }
  }
};

var blockData = {
  "/main/": { },
  "/main/index.html": { "data": "<h1>Welcome to main!</h1><p ng-repeat='c in rootBlock.comments'>{{ c.data }}</p>"},
  "/main/comments/": { },
  "/main/comments/1": { "data": "first comment" },
  "/main/comments/2": { "data": "second comment" },
};


// var rootBlock = {
//   "main": {
//     "children": {
//       "index.html": { "data": "<h1>Welcome to main!</h1><p ng-repeat='c in rootBlock.comments'>{{ c.data }}</p>" }
//       "comments": {
//         "children": {
//           "1": { "data": "first comment" },
//           "2": { "data": "second comment" }
//         }
//       }
//     }
//   }
// };

app.use(express.static(__dirname + '/../build'));

var rpcMap = {
  pullBlockTree: function(data) {
    var blockPath = data.blockPath.split('/').splice(1);
    return blockPath.reduce((subTree, blockId) => subTree[blockId], blockStructure);
  },
  pullBlock: function(data) {
    return blockData[data.blockPath];
  }
};

io.on('connection', function(socket){

  socket.on('message', function(request) {
    console.log("Received request", request.method, request.id, request.data);
    var result = rpcMap[request.method](request.data);
    var response = {
      'id': request.id,
      'result': result
    };
    console.log("Sending response", response.id, response.result);
    socket.send(response);
  });

});

exports.startServer = function() {
  http.listen(port, function(){
    console.log('listening on *:' + port);
  });
};

if (require.main === module) {
  exports.startServer();
}
