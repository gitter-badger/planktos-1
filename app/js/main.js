"use strict";

var Client = require('client').default;

console.log(Client);

angular.module('app', ['ngMaterial'])
.controller('mainCtrl', ['$scope', '$timeout', ($scope, $timeout) => {

  var client = new Client();
  client.connect();

  $scope.blocks = client.blocks;

  $scope.messageText = '';

  $scope.postMessage = function() {
    client.pushBlock ($scope.messageText);
    $scope.messageText = '';
  };

  client.blockWatchers.push(function() {
    $timeout();
  });

  client.master.peerWatchers.push(function() {
    client.pullBlocks();
  });

}]);
