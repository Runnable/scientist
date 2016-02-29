'use strict'

var chai = require('chai')
chai.use(require('chai-as-promised'))
var assert = chai.assert

var clone = require('101/clone')
var sinon = require('sinon')

var Result = require('../../src/result')

var mockExperiment = {
  observations_are_equivalent: sinon.stub().returns(false),
  ignore_mismatched_observation: sinon.stub().returns(false)
}
var mockObservationOne = {
  name: 'control',
  value: 4
}
var mockObservationTwo = {
  name: 'candidate',
  value: 5
}

describe('Result', function () {
  it('should return equivalent results regardless of order', function () {
    var o1 = [clone(mockObservationOne), clone(mockObservationTwo)]
    var resultOne = new Result(
      mockExperiment,
      o1,
      o1[0]
    )
    var o2 = [clone(mockObservationTwo), clone(mockObservationOne)]
    var resultTwo = new Result(
      mockExperiment,
      o2,
      o2[1]
    )

    assert.ok(resultOne.mismatched())
    assert.ok(resultTwo.mismatched())
  })
})
