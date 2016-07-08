/* @flow */

import { List, Map } from 'immutable'
import assign from '101/assign'
import Debug from 'debug'
import find from '101/find'
import hasProperties from '101/has-properties'
import isFunction from '101/is-function'
import isObject from '101/is-object'
import KnuthShuffle from 'knuth-shuffle'
import Promise from 'bluebird'

import MismatchError from './errors/mismatch-error'
import Observation from './observation'
import Result from './result'

const debug = Debug('scientist:experiment')

class Experiment<V> {
  _beforeRunFn: (...rest: Array<any>) => boolean;
  _behaviors: Map<string, (...rest: Array<any>) => V>;
  _cleanerFn: (value: V) => V;
  _comparator: (a: Observation<V>, b: Observation<V>) => boolean;
  _context: Object;
  _ignores: List<(control: V, observation: V) => boolean>;
  _raiseOnMismatches: boolean;
  _runIfFn: (...rest: Array<any>) => boolean;
  enabled: boolean;
  name: string;

  constructor (name: string = 'experiment') {
    debug('constructor')
    this.name = name
    this.enabled = true
    this._behaviors = Map()
    this._context = {}
    this._ignores = List()
    this._raiseOnMismatches = false
  }

  publish (result: Object): Promise<boolean> {
    debug('publish')
    return Promise.resolve(true)
  }

  /**
   * Define a Function to run before an experiment begins, if the experiment is
   * enabled.
   * @param {Function} fn Function to run.
   */
  beforeRun (fn: () => boolean) {
    debug('beforeRun')
    this._beforeRunFn = fn
  }

  /**
   * Define a function to clean a value for publishing or storing.
   * @param {Function} fn Function to clean the value. Must take one argument,
   *   the value to be cleaned.
   */
  clean (fn: (value: V) => V): void {
    debug('clean')
    this._cleanerFn = fn
  }

  /**
   * Cleans a value with a configured clean block or just returns the value.
   * @private
   * @param {Object} value Value to be cleaned.
   * @return {Object} Cleaned (if applicable) value.
   */
  cleanValue (value: V): V {
    debug('cleanValue')
    if (isFunction(this._cleanerFn)) {
      return this._cleanerFn(value)
    } else {
      return value
    }
  }

  /**
   * Define a function to compare two experimental values.
   * @param {Function} fn Function to compare. Must accept two arguments, the
   *   control and candidate values, and return true or false.
   */
  compare (fn: (a: Observation<V>, b: Observation<V>) => boolean): void {
    debug('compare')
    this._comparator = fn
  }

  /**
   * Get or add to the extra experiment data.
   * @param {[Object]} context Extra data to add.
   * @return {Object} Extra experiment data.
   */
  context (context: ?Object): Object {
    debug('context')
    if (context && isObject(context)) {
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
  ignore (fn: (control: V, observation: V) => boolean): void {
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
  ignoreMismatchedObservation (
    control: Observation<V>,
    candidate: Observation<V>
  ): boolean {
    debug('ignoreMismatchedObservation')
    if (this._ignores.size === 0) {
      return false
    }
    return this._ignores.some((fn) => (fn(control.value, candidate.value)))
  }

  /**
   * Compare two observations using the configured comparator, if present.
   * @private
   * @param {Observation} control Control Observation.
   * @param {Observation} candidate Candidate Observation.
   * @return {Boolean} True if the two observations are equivalent.
   */
  observationsAreEquivalent (
    control: Observation<V>,
    candidate: Observation<V>
  ): boolean {
    debug('observationsAreEquivalent')
    if (isFunction(this._comparator)) {
      return this._comparator(control, candidate)
    } else {
      const sameValues = control.value === candidate.value
      const sameException = control.exception === candidate.exception
      return sameValues && sameException
    }
  }

  /**
   * Run all behaviors for the experiment, observing each and publishing results.
   * Return the result of the named behavior, default "control".
   * @private
   * @param {String} name Name of the behavior to run. Default: "control"
   * @return {Object} Result of the control behavior.
   */
  run (name: string = 'control'): Promise<V> {
    debug('run')
    return Promise.resolve().then(() => {
      const controlFunc = this._behaviors.get(name)
      if (!isFunction(controlFunc)) {
        throw new Error(`${name} behavior is missing.`)
      }

      if (!this.shouldExperimentRun()) {
        return controlFunc()
      }

      return Promise.resolve().then(() => {
        if (isFunction(this._beforeRunFn)) {
          return this._beforeRunFn()
        }
      })
        .then(() => {
          let promises = []

          const shuffle = KnuthShuffle.knuthShuffle
          shuffle(this._behaviors.keySeq().toArray()).forEach((key) => {
            const fn = this._behaviors.get(key)
            promises.push(Observation.create(key, this, fn))
          })

          return Promise.all(promises)
        })
        .then((observations) => {
          const control = find(observations, hasProperties({ name: name }))
          if (!control) {
            throw new Error(`Could not find control observation (${name})`)
          }
          const result = Result.create(this, observations, control)

          return this.publish(result)
            .then(() => {
              if (this.raiseOnMismatches() && result.mismatched()) {
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
  runIf (fn: () => boolean): void {
    debug('runIf')
    this._runIfFn = fn
  }

  /**
   * Does the _runIfFn allow the experiment to run?
   * @private
   * @return {Boolean} True if the _runIfFn returns true.
   */
  runIfFuncAllows (): boolean {
    debug('runIfFuncAllows')
    return isFunction(this._runIfFn)
      ? this._runIfFn()
      : true
  }

  /**
   * Determine if the experiment should be run.
   * @return {Boolean} True if the experiment is allowed to run.
   */
  shouldExperimentRun (): boolean {
    debug('shouldExperimentRun')
    return this._behaviors.size > 1 &&
      this.enabled &&
      this.runIfFuncAllows()
  }

  /**
   * Determine if mismatch errors should be thrown.
   * @return {[type]} [description]
   */
  raiseOnMismatches (): boolean {
    debug('raiseOnMismatches')
    return !!this._raiseOnMismatches
  }

  // FIXME(@bkendall): I dislike this...
  try (name: string | Function, fn?: Function): void {
    debug('try')
    if (typeof name === 'function') {
      fn = name
      name = 'candidate'
    }
    if (this._behaviors.has(name)) {
      throw new Error(`Name (${name}) is not unique for behavior`)
    }
    if (typeof fn !== 'function') {
      throw new Error('.try: Function is not a function.')
    }
    this._behaviors = this._behaviors.set(name, fn)
  }

  use (fn: Function): void {
    debug('use')
    this.try('control', fn)
  }
}

export default Experiment
