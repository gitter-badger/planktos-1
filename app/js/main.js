"use strict";

var Client = require('client').default;

angular.module('app', ['ngMaterial'])
.controller('mainCtrl', ['$scope', '$timeout', function($scope, $timeout) {

  var client = new Client();
  client.connect();

  $scope.getBlocks = function(path) {
    return client.getBlocks(path);
  };

  $scope.messageText = '';

  $scope.postMessage = function() {
    client.pushBlock ("", $scope.messageText);
    $scope.messageText = '';
  };

  // Refresh the view when we receive blocks
  client.onPulledBlocks(() => $timeout());

}]);
