'use strict'

var chai = require('chai')
chai.use(require('chai-as-promised'))
var assert = chai.assert
var sinon = require('sinon')

var Promise = require('bluebird')

var Observation = require('../../../src/observation')

describe('Observation', function () {
  var mockExperiment = {}
  var testFn
  beforeEach(function () {
    testFn = sinon.stub().returns(5)
    mockExperiment.cleanValue = sinon.stub().returnsArg(0)
  })

  describe('create', function () {
    it('should return a promse resolving in an observation', function () {
      function runThis () { return Promise.resolve().then(testFn) }
      return assert.isFulfilled(Observation.create('foo', mockExperiment, runThis))
        .then(function (observation) {
          assert.instanceOf(observation, Observation)
        })
    })

    it('should run the given test function', function () {
      function runThis () { return Promise.resolve().then(testFn) }
      return assert.isFulfilled(Observation.create('foo', mockExperiment, runThis))
        .then(function () {
          sinon.assert.calledOnce(testFn)
        })
    })

    it('should record the value', function () {
      function runThis () { return Promise.resolve().then(testFn) }
      return assert.isFulfilled(Observation.create('foo', mockExperiment, runThis))
        .then(function (observation) {
          assert.equal(observation.value, 5)
        })
    })

    it('should record a duration', function () {
      function runThis () { return new Promise(function (resolve) { setTimeout(resolve, 5) }) }
      return assert.isFulfilled(Observation.create('foo', mockExperiment, runThis))
        .then(function (observation) {
          assert.isAbove(observation.duration, 4)
        })
    })

    it('should record an exception, if thrown', function () {
      var error = new Error('foobar')
      function runThis () { return Promise.reject(error) }
      return assert.isFulfilled(Observation.create('foo', mockExperiment, runThis))
        .then(function (observation) {
          assert.equal(observation.exception, error)
        })
    })
  })

  describe('cleanedValue', function () {
    it('should clean the stored value', function () {
      function runThis () { return Promise.resolve().then(testFn) }
      return assert.isFulfilled(Observation.create('foo', mockExperiment, runThis))
        .then(function (observation) {
          var value = observation.cleanedValue()
          assert.equal(value, 5)
          sinon.assert.calledOnce(mockExperiment.cleanValue)
          sinon.assert.calledWith(mockExperiment.cleanValue, 5)
        })
    })

    it('should return undfined if no value', function () {
      function runThis () { return Promise.resolve().then(testFn) }
      return assert.isFulfilled(Observation.create('foo', mockExperiment, runThis))
        .then(function (observation) {
          delete observation.value
          var value = observation.cleanedValue()
          assert.equal(value, undefined)
          sinon.assert.notCalled(mockExperiment.cleanValue)
        })
    })
  })

  describe('raised', function () {
    it('should return true if there was an exception', function () {
      var error = new Error('foobar')
      function runThis () { return Promise.resolve().throw(error) }
      return assert.isFulfilled(Observation.create('foo', mockExperiment, runThis))
        .then(function (observation) {
          assert.equal(observation.raised(), true)
        })
    })

    it('should return false if there was no exception', function () {
      function runThis () { return Promise.resolve(5) }
      return assert.isFulfilled(Observation.create('foo', mockExperiment, runThis))
        .then(function (observation) {
          assert.equal(observation.raised(), false)
        })
    })
  })

  describe('equivalent_to', function () {
    var observation
    var equalObservation
    var notEqualObservation
    var throwsObservation
    var equalThrowsObservation
    var notEqualThrowsObservation
    var error = new Error('foobar')
    var otherError = new Error('asdf')
    beforeEach(function () {
      return Promise.resolve()
        .then(function () {
          function runThis () { return Promise.resolve(5) }
          return Observation.create('foo', mockExperiment, runThis)
            .then(function (o) { observation = o })
        })
        .then(function () {
          function runThis () { return Promise.resolve(5) }
          return Observation.create('bar', mockExperiment, runThis)
            .then(function (o) { equalObservation = o })
        })
        .then(function () {
          function runThis () { return Promise.resolve(6) }
          return Observation.create('baz', mockExperiment, runThis)
            .then(function (o) { notEqualObservation = o })
        })
        .then(function () {
          function runThis () { return Promise.reject(error) }
          return Observation.create('nope', mockExperiment, runThis)
            .then(function (o) { throwsObservation = o })
        })
        .then(function () {
          function runThis () { return Promise.reject(error) }
          return Observation.create('alsono', mockExperiment, runThis)
            .then(function (o) { equalThrowsObservation = o })
        })
        .then(function () {
          function runThis () { return Promise.reject(otherError) }
          return Observation.create('nonono', mockExperiment, runThis)
            .then(function (o) { notEqualThrowsObservation = o })
        })
    })

    it('should return false if passed not an Observation', function () {
      assert.notOk(observation.equivalentTo({}), 'object is invalid')
      assert.notOk(observation.equivalentTo('foo'), 'string is invalid')
      assert.notOk(observation.equivalentTo(4), 'number is invalid')
    })

    describe('with no exceptions', function () {
      it('should return true if compared with equivalent Observation value', function () {
        assert.ok(observation.equivalentTo(observation), 'equal to self')
        assert.ok(observation.equivalentTo(equalObservation), 'equal to equivalent')
      })

      it('should return false if compared with non equivalent Observation value', function () {
        assert.notOk(observation.equivalentTo(notEqualObservation), 'not equal to other')
      })
    })

    describe('when exceptions are thrown', function () {
      it('should return true if compared with equivalent Observation error', function () {
        assert.ok(throwsObservation.equivalentTo(throwsObservation), 'equal to self')
        assert.ok(throwsObservation.equivalentTo(equalThrowsObservation), 'equal to equivalent')
      })

      it('should return false if compared with non equivalent Observation error', function () {
        assert.notOk(throwsObservation.equivalentTo(notEqualThrowsObservation), 'not equal to other')
      })

      it('should return false if compared with Observation with no error', function () {
        assert.notOk(observation.equivalentTo(throwsObservation), 'not equal to error')
        assert.notOk(throwsObservation.equivalentTo(observation), 'not equal to valid')
      })
    })

    describe('when a comparator function is passed', function () {
      it('should use the comparator to compare the values', function () {
        var compare = sinon.stub().returns(true)
        assert.ok(observation.equivalentTo(notEqualObservation, compare), 'equal when forced')
      })
    })
  })
})
