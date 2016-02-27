import Debug from 'debug'
import Promise from 'bluebird'
import assign from '101/assign'
import find from '101/find'
import hasProperties from '101/has-properties'
import isString from '101/is-string'
import isFunction from '101/is-function'
import isObject from '101/is-object'
import knuth_shuffle from 'knuth-shuffle'
import { List, Map } from 'immutable'

import MismatchError from './errors/mismatch-error'
import Observation from './observation'
import Result from './result'

const debug = Debug('scientist:experiment')

class Experiment {
  constructor (name = 'experiment') {
    debug('constructor')
    this.name = name
    this.enabled = true
    this._behaviors = Map()
    this._context = {}
    this._ignores = List()
    this._raise_on_mismatches = false
  }

  publish (result) {
    debug('publish')
    return Promise.resolve(true)
  }

  /**
   * Define a Function to run before an experiment begins, if the experiment is
   * enabled.
   * @param {Function} fn Function to run.
   */
  before_run (fn) {
    debug('before_run')
    this._before_run_fn = fn
  }

  /**
   * Define a function to clean a value for publishing or storing.
   * @param {Function} fn Function to clean the value. Must take one argument,
   *   the value to be cleaned.
   */
  clean (fn) {
    debug('clean')
    this._cleaner_fn = fn
  }

  /**
   * Cleans a value with a configured clean block or just returns the value.
   * @private
   * @param {Object} value Value to be cleaned.
   * @return {Object} Cleaned (if applicable) value.
   */
  clean_value (value) {
    debug('clean_value')
    if (isFunction(this._cleaner_fn)) {
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
  compare (fn) {
    debug('compare')
    this._comparator = fn
  }

  /**
   * Get or add to the extra experiment data.
   * @param {[Object]} context Extra data to add.
   * @return {Object} Extra experiment data.
   */
  context (context) {
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
  ignore (fn) {
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
  ignore_mismatched_observation (control, candidate) {
    debug('ignore_mismatched_observation')
    if (this._ignores.size === 0) {
      return false
    }
    return this._ignores.some(fn => (fn(control.value, candidate.value)))
  }

  /**
   * Compare two observations using the configured comparator, if present.
   * @private
   * @param {Observation} control Control Observation.
   * @param {Observation} candidate Candidate Observation.
   * @return {Boolean} True if the two observations are equivalent.
   */
  observations_are_equivalent (control, candidate) {
    debug('observations_are_equivalent')
    if (isFunction(this._comparator)) {
      return this._comparator(control, candidate)
    } else {
      const same_values = control.value === candidate.value
      const same_exception = control.exception === candidate.exception
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
  run (name = 'control') {
    debug('run')
    return Promise.resolve().then(_ => {
      const control_fn = this._behaviors.get(name)
      if (!isFunction(control_fn)) {
        throw new Error(`${name} behavior is missing.`)
      }

      if (!this.should_experiment_run()) {
        return control_fn()
      }

      return Promise.resolve().then(_ => {
        if (isFunction(this._before_run_fn)) {
          return this._before_run_fn()
        }
      })
        .then(_ => {
          let promises = []

          const shuffle = knuth_shuffle.knuthShuffle
          shuffle(this._behaviors.keySeq().toArray()).forEach(key => {
            const fn = this._behaviors.get(key)
            promises.push(Observation.create(key, this, fn))
          })

          return Promise.all(promises)
        })
        .then(observations => {
          const control = find(observations, hasProperties({ name: name }))
          const result = Result.create(this, observations, control)

          return this.publish(result)
            .then(_ => {
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
  run_if (fn) {
    debug('run_if')
    this._run_if_fn = fn
  }

  /**
   * Does the _run_if_fn allow the experiment to run?
   * @private
   * @return {Boolean} True if the _run_if_fn returns true.
   */
  run_if_fn_allows () {
    debug('run_if_fn_allows')
    return isFunction(this._run_if_fn)
      ? this._run_if_fn()
      : true
  }

  /**
   * Determine if the experiment should be run.
   * @return {Boolean} True if the experiment is allowed to run.
   */
  should_experiment_run () {
    debug('should_experiment_run')
    return this._behaviors.size > 1 &&
      this.enabled &&
      this.run_if_fn_allows()
  }

  /**
   * Determine if mismatch errors should be thrown.
   * @return {[type]} [description]
   */
  raise_on_mismatches () {
    debug('raise_on_mismatches')
    return !!this._raise_on_mismatches
  }

  try (name, fn) {
    debug('try')
    if (!isString(name)) {
      fn = name
      name = 'candidate'
    }
    if (this._behaviors.has(name)) {
      throw new Error(`Name (${name}) is not unique for behavior`)
    }
    this._behaviors = this._behaviors.set(name, fn)
  }

  use (fn) {
    debug('use')
    this.try('control', fn)
  }
}

export default Experiment
