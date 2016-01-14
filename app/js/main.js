const client = require('client');

angular.module('app', ['ngMaterial'])
.controller('mainCtrl', ['$scope', '$timeout', ($scope, $timeout) => {

  $scope.blocks = { };
  $scope.board = 'Main';

  $scope.messageText = '';

  $scope.getBlockCount = function() {
    return Object.keys($scope.blocks).length;
  };

  $scope.postMessage = function() {
    client.pushBlock($scope.board, $scope.messageText)
      .then(() => {
        $scope.messageText = '';
        $scope.refresh();
      });
  };

  $scope.refresh = function() {
    client.pullBlockHashes($scope.board)
      .then((hashes) => {
        console.log("HASHES", hashes);
        hashes.forEach((hash) => {
          console.log("PULLING", hash);
          client.pullBlock($scope.board, hash)
            .then((block) => {
              $timeout(() => { $scope.blocks[block.hash] = block });
            })
            .done();
        });
      })
      .done();
  };

  $scope.refresh();

}]);
