'use strict'

var assign = require('101/assign')
var debug = require('debug')('scientist:experiment')
var find = require('101/find')
var hasProperties = require('101/has-properties')
var isFunction = require('101/is-function')
var isObject = require('101/is-object')
var isString = require('101/is-string')
var List = require('immutable').List
var Map = require('immutable').Map
var Promise = require('bluebird')

var MismatchError = require('./errors/mismatch-error')
var Observation = require('./observation')
var Result = require('./result')
var knuth_shuffle = require('knuth-shuffle')

function Experiment (name) {
  debug('constructor')
  this.name = name || 'experiment'
  this.enabled = true
  this._behaviors = Map()
  this._context = {}
  this._ignores = List()
  this._raise_on_mismatches = false
}

Experiment.prototype.publish = function (result) {
  debug('publish')
  return Promise.resolve(true)
}

/**
 * Define a Function to run before an experiment begins, if the experiment is
 * enabled.
 * @param {Function} fn Function to run.
 */
Experiment.prototype.before_run = function (fn) {
  debug('before_run')
  this._before_run_fn = fn
}

/**
 * Define a function to clean a value for publishing or storing.
 * @param {Function} fn Function to clean the value. Must take one argument,
 *   the value to be cleaned.
 */
Experiment.prototype.clean = function (fn) {
  debug('clean')
  this._cleaner_fn = fn
}

/**
 * Cleans a value with a configured clean block or just returns the value.
 * @private
 * @param {Object} value Value to be cleaned.
 * @return {Object} Cleaned (if applicable) value.
 */
Experiment.prototype.clean_value = function (value) {
  debug('clean_value')
  if (this._cleaner_fn) {
    return this._cleaner_fn(value)
  } else {
    return value
  }
}

/**
 * Define a function to compare two experimental values.
 * @param {Function} fn Function to compare. Must accept two arguments, the
 *   control and candidate values, and return true or false.
 */
Experiment.prototype.compare = function (fn) {
  debug('compare')
  this._comparator = fn
}

/**
 * Get or add to the extra experiment data.
 * @param {[Object]} context Extra data to add.
 * @return {Object} Extra experiment data.
 */
Experiment.prototype.context = function (context) {
  debug('context')
  if (isObject(context)) {
    assign(this._context, context)
  }
  return this._context
}

/**
 * Configure experiment to ignore an observation with the given function. The
 * function takes two arguments, the control and the candidate observation that
 * do not match. If the function returns true, the mismatch is discarded.
 * @param {Function} fn Function that returns a boolean about a match.
 */
Experiment.prototype.ignore = function (fn) {
  debug('ignore')
  this._ignores = this._ignores.push(fn)
}

/**
 * Iterates through ignore functions to determine if a mismatch should be
 * ignored.
 * @private
 * @param {Object} control Control value.
 * @param {Object} candidate Candidate value that mismatches.
 * @return {boolean} Returns true if the pair should be ignored.
 */
Experiment.prototype.ignore_mismatched_observation = function (control, candidate) {
  debug('ignore_mismatched_observation')
  if (this._ignores.size === 0) {
    return false
  }
  return this._ignores.some(function (fn) {
    return fn(control.value, candidate.value)
  })
}

/**
 * Compare two observations using the configured comparator, if present.
 * @private
 * @param {Observation} control Control Observation.
 * @param {Observation} candidate Candidate Observation.
 * @return {Boolean} True if the two observations are equivalent.
 */
Experiment.prototype.observations_are_equivalent = function (control, candidate) {
  debug('observations_are_equivalent')
  if (this._comparator) {
    return this._comparator(control, candidate)
  } else {
    var same_values = control.value === candidate.value
    var same_exception = control.exception === candidate.exception
    return same_values && same_exception
  }
}

/**
 * Run all behaviors for the experiment, observing each and publishing results.
 * Return the result of the named behavior, default "control".
 * @private
 * @param {String} name Name of the behavior to run. Default: "control"
 * @return {Object} Result of the control behavior.
 */
Experiment.prototype.run = function (name) {
  debug('run')
  return Promise.resolve().bind(this)
    .then(function () {
      name = name || 'control'
      var control_fn = this._behaviors.get(name)

      if (!control_fn) {
        throw new Error(name + ' behavior is missing.')
      }

      if (!this.should_experiment_run()) {
        return control_fn()
      }

      return Promise.resolve().bind(this)
        .then(function checkRunBefore () {
          if (this._before_run_fn) {
            return this._before_run_fn()
          } else {
            return true
          }
        })
        .then(function runObservations () {
          var promises = []

          var shuffle = knuth_shuffle.knuthShuffle
          shuffle(this._behaviors.keySeq().toArray()).forEach(function (key) {
            var fn = this._behaviors.get(key)
            promises.push(Observation.create(key, this, fn))
          }.bind(this))

          return Promise.all(promises)
        })
        .then(function (observations) {
          var control = find(observations, hasProperties({ name: name }))

          var result = Result.create(this, observations, control)

          return this.publish(result).bind(this)
            .then(function () {
              if (this.raise_on_mismatches() && result.mismatched()) {
                throw new MismatchError(name, result)
              }

              if (control.raised()) {
                throw control.exception
              } else {
                return control.value
              }
            })
        })
    })
}

/**
 * Define a function that determines if the experiment can be run.
 * @param {Function} fn Function determining fate of experiment. Returns true or
 *   false.
 */
Experiment.prototype.run_if = function (fn) {
  debug('run_if')
  this._run_if_fn = fn
}

/**
 * Does the _run_if_fn allow the experiment to run?
 * @private
 * @return {Boolean} True if the _run_if_fn returns true.
 */
Experiment.prototype.run_if_fn_allows = function () {
  debug('run_if_fn_allows')
  return isFunction(this._run_if_fn)
    ? this._run_if_fn()
    : true
}

/**
 * Determine if the experiment should be run.
 * @return {Boolean} True if the experiment is allowed to run.
 */
Experiment.prototype.should_experiment_run = function () {
  debug('should_experiment_run')
  return this._behaviors.size > 1 &&
  this.enabled &&
  this.run_if_fn_allows()
}

// FIXME(bryan): raise -> throw
/**
 * Determine if mismatch errors should be thrown.
 * @return {[type]} [description]
 */
Experiment.prototype.raise_on_mismatches = function () {
  debug('raise_on_mismatches')
  return !!this._raise_on_mismatches
}

Experiment.prototype.try = function (name, fn) {
  debug('try')
  if (!isString(name)) {
    fn = name
    name = 'candidate'
  }
  if (this._behaviors.has(name)) {
    throw new Error('Name is not unique for behavior')
  }
  this._behaviors = this._behaviors.set(name, fn)
}

Experiment.prototype.use = function (fn) {
  debug('use')
  this.try('control', fn)
}

module.exports = Experiment
