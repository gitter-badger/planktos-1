"use strict";

var Client = require('client');

angular.module('app', ['ngMaterial'])
.controller('mainCtrl', ['$scope', '$timeout', '$window', ($scope, $timeout, $window) => {

  var client = new Client($window.location.toString());

  $scope.blocks = client.blocks;

  $scope.messageText = '';

  $scope.postMessage = function() {
    client.pushBlock ($scope.messageText);
    $scope.messageText = '';
  };

  client.blockWatchers.push(function() {
    $timeout();
  });

  client.peerWatchers.push(function() {
    client.pullBlocks();
  });

  client.findPeers();

}]);
