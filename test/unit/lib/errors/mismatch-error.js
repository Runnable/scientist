'use strict'

var chai = require('chai')
chai.use(require('chai-as-promised'))
var assert = chai.assert

var MismatchError = require('errors/mismatch-error')

describe('MismatchError', function () {
  it('should set the message as passed to it', function () {
    var e = new MismatchError('foobar')
    console.log(e)
    assert.equal(e.message, 'foobar')
  })

  it('should store a result object', function () {
    var o = { foo: 'bar' }
    var e = new MismatchError('foobar', o)
    assert.deepEqual(e.result, o)
  })
})
