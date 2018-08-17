// Copyright (c) Microsoft Corporation and others. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

// These tests are in a separate file (from file.js) to allow for proxying `recursive-readdir`
// used in `FileStore`.
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const sandbox = sinon.createSandbox()
const assert = require('assert')
const ResultCoordinates = require('../../../lib/resultCoordinates')
const EntityCoordinates = require('../../../lib/entityCoordinates')

var FileStore

describe('list a tool result ', () => {
  beforeEach(function() {
    const recursiveStub = async path => {
      path = path.replace(/\\/g, '/')
      if (path.includes('error')) throw new Error('test error')
      const result = [
        '/foo/npm/npmjs/-/test/revision/0.0',
        '/foo/npm/npmjs/-/test/revision/1.0/tool/testtool/2.0.json',
        '/foo/npm/npmjs/-/test/revision/2.0/tool/testtool0/1.0.json',
        '/foo/npm/npmjs/-/test/revision/2.0/tool/testtool1/2.0.json',
        '/foo/npm/npmjs/-/test/revision/2.0/tool/testtool2/3.0.json'
      ].filter(p => p.startsWith(path))
      if (result.length === 0) {
        const error = new Error('test')
        error.code = 'ENOENT'
        throw error
      }
      return result.filter(p => p !== path)
    }
    const fsStub = {
      readFile: (path, cb) => {
        if (path.startsWith('/foo/npm/npmjs/-/test/revision/1.0/tool/')) {
          cb(null, JSON.stringify({ _metadata: { coordinates: 'npm/npmjs/-/test/1.0' } }))
        } else if (path.startsWith('/foo/npm/npmjs/-/test/revision/2.0/tool/')) {
          cb(null, JSON.stringify({ _metadata: { coordinates: 'npm/npmjs/-/test/2.0' } }))
        } else {
          cb(path + ' is not stubbed :(')
        }
      }
    }
    FileStore = proxyquire('../../../providers/stores/file', { 'recursive-readdir': recursiveStub, fs: fsStub })
  })

  afterEach(function() {
    sandbox.restore()
  })

  it('throws original error when not ENOENT', async () => {
    const fileStore = FileStore({ location: '/foo' })
    try {
      await fileStore.list(new EntityCoordinates('npm', 'npmjs', null, 'error', '0.0'))
      assert.fail('should have thrown error')
    } catch (error) {
      assert.equal(error.message, 'test error')
    }
  })

  it('works for unknown path coordinates ', async () => {
    const fileStore = FileStore({ location: '/foo' })
    const result = await fileStore.list(new EntityCoordinates('npm', 'npmjs', null, 'bogus', '0.0'))
    assert.equal(result.length, 0)
  })

  it('works for zero entity coordinates ', async () => {
    const fileStore = FileStore({ location: '/foo' })
    const result = await fileStore.list(new EntityCoordinates('npm', 'npmjs', null, 'test', '0.0'))
    assert.equal(result.length, 0)
  })

  it('works for zero result coordinates ', async () => {
    const fileStore = FileStore({ location: '/foo' })
    const result = await fileStore.listResults(new EntityCoordinates('npm', 'npmjs', null, 'test', '0.0'))
    assert.equal(result.length, 0)
  })

  it('works for single entity coordinates ', async () => {
    const fileStore = FileStore({ location: '/foo' })
    const result = await fileStore.list(new EntityCoordinates('npm', 'npmjs', null, 'test', '1.0'))
    const expected = new EntityCoordinates('npm', 'npmjs', null, 'test', '1.0').toString()
    assert.equal(result.length, 1)
    assert.deepEqual(result[0], expected)
  })

  it('works for single result coordinates ', async () => {
    const fileStore = FileStore({ location: '/foo' })
    const result = await fileStore.listResults(new EntityCoordinates('npm', 'npmjs', null, 'test', '1.0'))
    const expected = new ResultCoordinates('npm', 'npmjs', null, 'test', '1.0', 'testtool', '2.0').toString()
    assert.equal(result.length, 1)
    assert.deepEqual(result[0], expected)
  })

  it('works for multiple entity coordinates ', async () => {
    const fileStore = FileStore({ location: '/foo' })
    const result = await fileStore.list(new EntityCoordinates('npm', 'npmjs', null, 'test', '2.0'))
    // Note there is only one since the entity is the same for all three available paths.
    assert.equal(result.length, 1)
    const expected = new EntityCoordinates('npm', 'npmjs', null, 'test', '2.0').toString()
    assert.deepEqual(result[0], expected)
  })

  it('works for multiple result coordinates ', async () => {
    const fileStore = FileStore({ location: '/foo' })
    const result = await fileStore.listResults(new EntityCoordinates('npm', 'npmjs', null, 'test', '2.0'))
    assert.equal(result.length, 3)
    let expected = new ResultCoordinates('npm', 'npmjs', null, 'test', '2.0', 'testtool0', '1.0').toString()
    assert.deepEqual(result[0], expected)
    expected = new ResultCoordinates('npm', 'npmjs', null, 'test', '2.0', 'testtool1', '2.0').toString()
    assert.deepEqual(result[1], expected)
    expected = new ResultCoordinates('npm', 'npmjs', null, 'test', '2.0', 'testtool2', '3.0').toString()
    assert.deepEqual(result[2], expected)
  })
})
