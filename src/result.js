/* @flow */

import { List } from 'immutable'
import Debug from 'debug'

import Experiment from './experiment'
import Observation from './observation'

const debug = Debug('scientist:result')

class Result<V> {
  _ignored: List<Observation<V>>;
  _mismatched: List<Observation<V>>;
  candidates: List<Observation<V>>;
  control: Observation<V>;
  experiment: Experiment<V>;
  observations: Array<Observation<V>>;

  constructor (
    experiment: Experiment<V>,
    observations: Array<Observation<V>>,
    control: Observation<V>
  ) {
    debug('constructor')
    this.experiment = experiment
    this.observations = observations
    this.control = control

    this.candidates = List(observations)
    this.candidates = this.candidates.filterNot((c) => (c.name === 'control'))

    this._mismatched = List()
    this._ignored = List()

    this.evaluateCandidates()
  }

  /**
   * Create a new Result.
   * @param {Experiment} experiment Experiment to which this result belongs.
   * @param {Array<Observation>} observations Array of Observations in execution
   *   order.
   * @param {Observation} control Observation of the control.
   * @return {Result} New Result.
   */
  static create (
    experiment: Experiment<V>,
    observations: Array<Observation<V>>,
    control: Observation<V>
  ): Result<V> {
    debug('create')
    return new Result(experiment, observations, control)
  }

  /**
   * Get the Experiment's context.
   * @return {Object} Experiment's context.
   */
  context (): Object {
    debug('context')
    return this.experiment.context()
  }

  /**
   * Get the Experiment's name.
   * @return {String} Experiment's name.
   */
  experimentName (): string {
    debug('experimentName')
    return this.experiment.name
  }

  /**
   * Was the result a match between all behaviors?
   * @return {Boolean} Returns true if all the results are equivalent.
   */
  matched (): boolean {
    debug('matched')
    return this._mismatched.size === 0 && !this.ignored()
  }

  /**
   * Were there mismatches in the behaviors?
   * @return {Boolean} Returns true if there were mismatched behaviors.
   */
  mismatched (): boolean {
    debug('mismatched')
    return this._mismatched.size > 0
  }

  /**
   * Were there any mismatches that were ignored?
   * @return {Boolean} Returns true if there were any ignored mismatches.
   */
  ignored (): boolean {
    debug('ignored')
    return this._ignored.size > 0
  }

  /**
   * Look through the candidates to find mismatched and ignored results. Sets
   * ._mismatched and ._ignored with appropriate candidates.
   * @private
   */
  evaluateCandidates (): void {
    let mismatched = this.candidates.filter((candidate) => {
      return !this.experiment.observationsAreEquivalent(this.control, candidate)
    })

    mismatched.forEach((candidate) => {
      const ignore = this.experiment.ignoreMismatchedObservation(
        this.control,
        candidate
      )
      if (ignore) {
        this._ignored = this._ignored.push(candidate)
      } else {
        this._mismatched = this._mismatched.push(candidate)
      }
    })
  }
}

export default Result
