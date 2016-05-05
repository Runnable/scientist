'use strict'

var chai = require('chai')
chai.use(require('chai-as-promised'))
var assert = chai.assert

var sinon = require('sinon')

var Result = require('../../../src/result')

describe('Result', function () {
  var result
  var mockContext = { zip: 'zap' }
  var mockExperiment = {
    name: 'foobar',
    context: sinon.stub().returns(mockContext)
  }
  var mockObservations = [{ name: 'control' }, { name: 'candidate' }]
  var mockControl = { name: 'control' }
  beforeEach(function () {
    sinon.stub(Result.prototype, 'evaluateCandidates')
  })
  afterEach(function () {
    Result.prototype.evaluateCandidates.restore()
  })

  describe('create', function () {
    it('should return a new Result', function () {
      var r = Result.create(mockExperiment, mockObservations, mockControl)
      assert.instanceOf(r, Result)
    })
  })

  describe('context', function () {
    it('should return the experiment context', function () {
      result = Result.create(mockExperiment, mockObservations, mockControl)
      assert.deepEqual(result.context(), mockExperiment.context())
      assert.deepEqual(result.context(), mockContext)
    })
  })

  describe('experimentName', function () {
    it('should return the experiment name', function () {
      result = Result.create(mockExperiment, mockObservations, mockControl)
      assert.deepEqual(result.experimentName(), 'foobar')
    })
  })

  describe('matched', function () {
    it('should return true if all of the results matched', function () {
      result = Result.create(mockExperiment, mockObservations, mockControl)
      assert.ok(result.matched())
    })

    describe('with mismatched results', function () {
      beforeEach(function () {
        result = Result.create(mockExperiment, mockObservations, mockControl)
        result._mismatched = result._mismatched.push({})
      })

      it('should return false', function () {
        assert.notOk(result.matched())
      })
    })
  })

  describe('mismatched', function () {
    beforeEach(function () {
      result = Result.create(mockExperiment, mockObservations, mockControl)
    })

    describe('with mismatched candidates', function () {
      beforeEach(function () {
        result._mismatched = result._mismatched.push({})
      })

      it('should return true', function () {
        assert.ok(result.mismatched())
      })
    })

    describe('with no mismatched candidates', function () {
      it('should return false', function () {
        assert.notOk(result.mismatched())
      })
    })
  })

  describe('ignored', function () {
    beforeEach(function () {
      result = Result.create(mockExperiment, mockObservations, mockControl)
    })

    describe('with no ignored candidates', function () {
      it('should return false', function () {
        assert.notOk(result.ignored())
      })
    })

    describe('with ignored candidates', function () {
      beforeEach(function () {
        result._ignored = result._ignored.push({})
      })

      it('should return true', function () {
        assert.ok(result.ignored())
      })
    })
  })

  describe('evaluateCandidates', function () {
    beforeEach(function () {
      Result.prototype.evaluateCandidates.restore()
    })
    afterEach(function () {
      sinon.stub(Result.prototype, 'evaluateCandidates')
    })

    describe('should collect all equivalent observations', function () {
      beforeEach(function () {
        mockExperiment.observationsAreEquivalent = sinon.stub().returns(true)
        result = Result.create(mockExperiment, mockObservations, mockControl)
      })

      it('should leave _mismatched empty', function () {
        assert.equal(result._mismatched.size, 0)
      })

      it('should not ignore any', function () {
        assert.equal(result._ignored.size, 0)
      })
    })

    describe('should collect all mismatched observations', function () {
      beforeEach(function () {
        mockExperiment.observationsAreEquivalent = sinon.stub().returns(false)
        mockExperiment.ignoreMismatchedObservation = sinon.stub().returns(false)
        result = Result.create(mockExperiment, mockObservations, mockControl)
      })

      it('should populate _mismatched', function () {
        assert.equal(result._mismatched.size, 1)
        assert.deepEqual(result._mismatched.first(), { name: 'candidate' })
      })

      it('should not ignore any', function () {
        assert.equal(result._ignored.size, 0)
      })
    })

    describe('should collect all mismatched and ignored observations', function () {
      beforeEach(function () {
        mockExperiment.observationsAreEquivalent = sinon.stub().returns(false)
        mockExperiment.ignoreMismatchedObservation = sinon.stub().returns(true)
        result = Result.create(mockExperiment, mockObservations, mockControl)
      })

      it('should not populate _mismatched (goes to ignored)', function () {
        assert.equal(result._mismatched.size, 0)
      })

      it('should ignore them as well', function () {
        assert.equal(result._ignored.size, 1)
        assert.deepEqual(result._ignored.first(), { name: 'candidate' })
      })
    })
  })
})
