"use strict";

var Client = require('client').default;
var client = new Client();

angular.module('app', ['ngMaterial'])
.controller('mainCtrl', ['$scope', '$timeout', function($scope, $timeout) {

  var myVotes = {}; // block.id -> vote. Either +1 or -1)

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

  $scope.getVoteCount = function(block) {
    var sum = 0;
    var voteBlocks = client.getBlocks(block.id + '/vote');
    for (var i in voteBlocks)
      sum += voteBlocks[i].content;
    return sum;
  };

  // sign is the vote. Either +1 or -1
  $scope.vote = function(block, sign) {
    if (!(block.id in myVotes)) {
      myVotes[block.id] = sign;
      client.pushBlock(block.id + '/vote', sign);
    }
  };

  $scope.getMyVote = function(block) {
    return block.id in myVotes ? myVotes[block.id] : 0;
  };

  client.on('pulled-blocks', function(blocks, path) {
    if (path === "") {
      // Just received new posts, pull all of it's votes
      for (var i in blocks) {
        client.pullBlocks(blocks[i].id + '/vote');
      }
    }
    // Update the angular view
    $timeout();
  });

  client.connect();

}])
.controller('loadingCtrl', ['$scope', '$timeout', function($scope, $timeout) {

  var timedOut = false;

  $scope.isLoading = function() {
    return !timedOut || $scope.foundBlocks();
  };

  $scope.foundBlocks = function() {
    return client.getBlocks('').length !== 0;
  };

  $scope.loadFailed = function() {
    return timedOut && !$scope.foundBlocks();
  };

  $timeout(function() {
    timedOut = true;
  }, 10000); // 10 seconds
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
