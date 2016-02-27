import Promise from 'bluebird'
import isFunction from '101/is-function'

class Observation {
  constructor (name, experiment, fn) {
    this.name = name
    this.experiment = experiment
    this.now = Date.now()
    this.fn = fn
  }

  static create (name, experiment, fn) {
    const observation = new Observation(name, experiment, fn)
    return Promise.resolve()
      .then(_ => (observation.fn()))
      .then(value => { observation.value = value })
      .catch(err => { observation.exception = err })
      .then(_ => {
        observation.duration = Date.now() - observation.now
        return observation
      })
  }

  /**
   * Return a cleaned value for publishing. Uses the experiment's defined cleaner
   * block to clean the observed value.
   * @return {Object} Cleaned value.
   */
  cleaned_value () {
    if (this.value) {
      return this.experiment.clean_value(this.value)
    }
  }

  /**
   * Check to see if this observation ever raised an exception.
   * @return {Boolean} True if an exception was recorded.
   */
  raised () {
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
  equivalent_to (other, comparator) {
    if (!(other instanceof Observation)) {
      return false
    }

    let values_are_equal = false
    const both_raised = other.raised() && this.raised()
    const neither_raised = !other.raised() && !this.raised()

    if (neither_raised) {
      if (isFunction(comparator)) {
        values_are_equal = comparator(this.value, other.value)
      } else {
        values_are_equal = this.value === other.value
      }
    }

    const exceptions_are_equivalent = both_raised &&
      other.exception.message === this.exception.message

    return (neither_raised && values_are_equal) ||
      (both_raised && exceptions_are_equivalent)
  }
}

export default Observation
