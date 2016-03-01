/* @flow */

import ExtendableError from 'es6-error'

class MismatchError <T> extends ExtendableError {
  result: T;

  constructor (message: string, result: T) {
    super(message)
    this.result = result
  }
}

export default MismatchError
