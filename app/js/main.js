const client = require('client');

angular.module('app', ['ngMaterial'])
.controller('mainCtrl', ['$scope', '$timeout', ($scope, $timeout) => {

  $scope.blocks = { };
  $scope.board = 'Main';

  $scope.messageText = '';

  $scope.getBlockCount = function() {
  };

  $scope.postMessage = function() {
  };

  $scope.refresh = function() {
  };

}]);
