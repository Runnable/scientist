'use strict'

var util = require('util')

function MismatchError (message, result) {
  Error.call(this)
  this.message = message
  this.result = result
}
util.inherits(MismatchError, Error)

module.exports = MismatchError
