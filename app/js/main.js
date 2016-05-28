"use strict";

var Client = require('client').default;
var client = new Client();

angular.module('app', ['ngMaterial'])
.controller('mainCtrl', ['$scope', '$timeout', function($scope, $timeout) {

  client.connect();

  $scope.selectedPost = null;

  $scope.selectPost = function(block) {
    $scope.selectedPost = $scope.selectedPost == block ? null : block;
  };

  $scope.getBlocks = function(path) {
    return client.getBlocks(path);
  };

  $scope.getTitlePreview = function(block) {
    var max = 50;
    if ($scope.selectedPost !== block && block.content.title.length > max)
      return block.content.title.substr(0, max) + "...";
    return block.content.title;
  };

  $scope.getBodyPreview = function(block) {
    var max = 50;
    if (block.content.body.length > max)
      return block.content.body.substr(0, max) + "...";
    return block.content.body;
  };

  // Refresh the view when we receive blocks
  client.onPulledBlocks(() => $timeout());
}])
.controller('createPostCtrl', ['$scope', function($scope) {
  $scope.postBody = '';
  $scope.postTitle = '';

  $scope.canSubmit = function() {
    return $scope.postBody != '' &&
           $scope.postTitle != '';
  };

  $scope.submitPost = function() {
    client.pushBlock ("", {
      title: $scope.postTitle,
      body: $scope.postBody
    });
    $scope.postBody = '';
    $scope.postTitle = '';
  };
  
}]);
