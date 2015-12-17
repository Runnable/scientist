'use strict'

var isFunction = require('101/is-function')
var Promise = require('bluebird')

function Observation (name, experiment, fn) {
  this.name = name
  this.experiment = experiment
  this.now = Date.now()
  this.fn = fn
}

Observation.create = function (name, experiment, fn) {
  var observation = new Observation(name, experiment, fn)
  return Promise.resolve()
    .return(observation.fn())
    .then(function (value) {
      observation.value = value
    })
    .catch(function (err) {
      observation.exception = err
    })
    .then(function () {
      observation.duration = Date.now() - observation.now
    })
    .return(observation)
}

/**
 * Return a cleaned value for publishing. Uses the experiment's defined cleaner
 * block to clean the observed value.
 * @return {Object} Cleaned value.
 */
Observation.prototype.cleaned_value = function () {
  if (this.value) {
    return this.experiment.clean_value(this.value)
  }
}

/**
 * Is this observation equivalent to another?
 * Returns true if:
 *   - The values are equal using `===`.
 *   - The values are equal according to a comparator function.
 *   - Both observations threw the same exceptions.
 * @param {Observation} other Other observation in question.
 * @param {Function} comparator Comparator function that takes two values.
 * @return {Boolean} True if they are equivalent.
 */
Observation.prototype.equivalent_to = function (other, comparator) {
  if (!(other instanceof Observation)) {
    return false
  }

  var values_are_equal = false
  var both_raised = other.raised() && this.raised()
  var neither_raised = !other.raised() && !this.raised()

  if (neither_raised) {
    if (isFunction(comparator)) {
      values_are_equal = comparator(this.value, other.value)
    } else {
      values_are_equal = this.value === other.value
    }
  }

  var exceptions_are_equivalent = both_raised &&
    other.exception.message === this.exception.message

  return (neither_raised && values_are_equal) ||
  (both_raised && exceptions_are_equivalent)
}

/**
 * Check to see if this observation ever raised an exception.
 * @return {Boolean} True if an exception was recorded.
 */
Observation.prototype.raised = function () {
  return !!this.exception
}

module.exports = Observation
