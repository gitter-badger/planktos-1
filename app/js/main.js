const client = require('client');

angular.module('app', ['ngMaterial'])
.controller('mainCtrl', ['$scope', '$timeout', ($scope, $timeout) => {

  $scope.blocks = client.blocks;

  $scope.messageText = '';

  $scope.postMessage = function() {
    client.pushBlock ($scope.messageText);
    $scope.messageText = '';
  };

  client.blockWatchers.push(function() {
    console.log("CHANGE");
    $timeout();
  });

}]);
