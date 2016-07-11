/* @flow */

import Promise from 'bluebird'

import Experiment from './experiment'

class Observation<V> {
  duration: number;
  exception: Error;
  experiment: Experiment<V>;
  fn: (...rest: Array<any>) => Promise<V> | V;
  name: string;
  now: number;
  value: V;

  constructor (
    name: string,
    experiment: Experiment<V>,
    fn: (...rest: Array<any>
  ) => Promise<V> | V) {
    this.name = name
    this.experiment = experiment
    this.now = Date.now()
    this.fn = fn
  }

  static create (
    name: string,
    experiment: Experiment<V>,
    fn: (...rest: Array<any>) => Promise<V> | V
  ): Promise<Observation<V>> {
    const observation = new Observation(name, experiment, fn)
    return Promise.resolve()
      .then(() => (observation.fn()))
      .then((value) => { observation.value = value })
      .catch((err) => { observation.exception = err })
      .then(() => {
        observation.duration = Date.now() - observation.now
        return observation
      })
  }

  /**
   * Return a cleaned value for publishing. Uses the experiment's defined
   * cleaner block to clean the observed value.
   * @return {Object} Cleaned value.
   */
  cleanedValue (): ?V {
    if (this.value) {
      return this.experiment.cleanValue(this.value)
    }
  }

  /**
   * Check to see if this observation ever raised an exception.
   * @return {Boolean} True if an exception was recorded.
   */
  raised (): boolean {
    return !!this.exception
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
  equivalentTo (
    other: Observation<V>,
    comparator: (a: V, b: V) => boolean
  ): boolean {
    if (!(other instanceof Observation)) {
      return false
    }

    let valuesAreEqual = false
    const bothRaised = other.raised() && this.raised()
    const neitherRaised = !other.raised() && !this.raised()

    if (neitherRaised) {
      if (typeof comparator === 'function') {
        valuesAreEqual = comparator(this.value, other.value)
      } else {
        valuesAreEqual = this.value === other.value
      }
    }

    const exceptionsAreEquivalent = bothRaised &&
      other.exception.message === this.exception.message

    return (neitherRaised && valuesAreEqual) ||
      (bothRaised && exceptionsAreEquivalent)
  }
}

export default Observation
