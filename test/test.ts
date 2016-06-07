import { equal } from 'assert';
import { normalizePath } from '../lib/client';

describe('sanity tests', function() {
  it('normalize path test', function() {
    let path = '/a////a/a/a///////asdfadsf////asdfasdf//////asdfasdf//';
    path = normalizePath(path);
    equal(path.match(/\/{2,}/), null);
  });
});
