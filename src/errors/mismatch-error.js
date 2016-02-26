import ExtendableError from 'es6-error'

class MismatchError extends ExtendableError {
  constructor (message, result) {
    super(message)
    this.result = result
  }
}

export default MismatchError
