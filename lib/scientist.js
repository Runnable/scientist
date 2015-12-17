'use strict'

var Experiment = require('./experiment')

function Scientist () {}

Scientist.prototype.science = function (name, opts) {
  opts = opts || {}
  var Type = opts.Experiment || Experiment
  var experiment = new Type(name)
  experiment.context({})
  return experiment
}

Scientist.Experiment = Experiment

module.exports = Scientist
