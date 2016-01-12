var assert = require('assert');
var Q = require('q');
var client = require('../lib/client');

var randomString = function() {
  return "" + Math.round(Math.random() * 9999999999);
}

describe('test basic block push/pull', function() {

  var removeAllBoards = function() {
    client.pullBoards()
    .then((boards) => {
      return Q.all(boards.map(client.deleteBoard));
    })
    .done();
  };

  before(function() {
    removeAllBoards();
  });

  after(function() {
    removeAllBoards();
  });

  it('empty board should have no block hashes', function(done) {
    client.pullBlockHashes(randomString())
    .then(function(hashes) {
      assert(hashes.length == 0);
      done();
    })
    .done();
  });

  it('simple push/pull', function(done) {
    var board = randomString();
    client.pushBlock(board, "hello")
    .then(function() {
      return client.pullBlockHashes(board);
    })
    .then(function(hashes) {
      assert(hashes.length == 1);
      return client.pullBlock(board, hashes[0]);
    })
    .then(function(block) {
      assert(block.data == "hello");
      done();
    })
    .done();
  });

  it('multiple pushes and pulls', function(done) {
    var board = randomString();
    var blockData = ["hello", "something", "bye"];
    Q.all(blockData.map(function(data) {
      return client.pushBlock(board, data);
    }))
    .then(function() {
      return client.pullBlockHashes(board);
    })
    .then(function(hashes) {
      assert(hashes.length == 3);
      return Q.all(hashes.map(function(hash) {
        return client.pullBlock(board, hash);
      }));
    })
    .then(function(blocks) {
      blocks.forEach(function(block) {
        assert(blockData.indexOf(block.data) != -1);
        blockData.splice(blockData.indexOf(block.data), 1);
      });
      assert(blockData.length == 0);
      done();
    })
    .done();
  });

  it('pull boards contains newly created board', function(done) {
    var board = randomString();
    client.pushBlock(board, "foo bar")
    .then(() => { return client.pullBoards(); })
    .then(function(boards) {
      assert(boards.indexOf(board) != -1);
      done();
    })
    .done();
  });

});
