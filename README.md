# Scientist

A Javascript library for carefully refactoring critical paths. Influenced heavily from [github/scientist](https://github.com/github/scientist).

Scientist is built with and accepts Promises (or Functions that return Promises) in any experiment.

## How to Science!

Here's a quick and dirty example of how to Science!

```javascript
var Experiment = require('node-scientist').Experiment

var experiment = new Experiment('getData')
// use: the control. value will be returned by `.run`.
experiment.use(function () { return Promise.resolve().return(true) })
// try: the candidate. value will be reported in `.publish`.
experiment.try(function () { return Promise.resolve().delay(10).return(false) })
// run: run the experiment.
experiment.run()
  .then(function (result) {
    // result === true, from `.use`.
  })
```

## Science within Models

```javascript
var Scientist = require('node-scientist')

function MyModel () {}
util.inherits(MyModel, Scientist)

MyModel.prototype.myMethod = function (cb) {
  var experiment = this.science('myMethod', { Experiment: MyExperiment })
  // use: the control. value will be returned by `.run`
  experiment.use(function () { return Promise.resolve().delay(10).return(7) })
  // try: the candidate. value will be reported in `.publish`.
  experiment.try(function () { return Promise.resolve().delay(5).throw(new Error('foo')) })
  // run: run the experiment.
  // NOTE: bluebird allows `.asCallback`, which can help in models w/ callbacks.
  experiment.run().asCallback(cb)
}

var m = new MyModel()
m.myMethod(function (err, value) {
  // err === undefined, candidate error is not passed through.
  // value === 7, from `.use`.
})
```

## Publishing Results

A very simple publisher that will print results to the screen.

```javascript
var Experiment = require('node-scientist').Experiment
var find = require('101/find')

function MyExperiment (name) {
  Experiment.call(this, name)
}
util.inherits(MyExperiment, Experiment)

/**
 * Publisher function. Takes a result, must return a Promise.
 * @param {Result} result Result object from Scientist.
 * @return {Promise} Promise resolved when publishing is done.
 */
MyExperiment.prototype.publish = function (result) {
  var control = find(result.observations, hasProperties({ name: 'control' }))
  var candidate = find(result.observations, hasProperties({ name: 'candidate' }))
  console.log('Results:')
  console.log('Correctness (were the candidates correct?):', !result.mismatched() ? 'yes' : 'no')
  console.log('Values (control, candidate):', control.value, candidate.value)
  console.log('Candidate Time:', candidate.duration)
  console.log('Control Time:', control.duration)
  console.log('Improvement Time (+larger is better):', control.duration - candidate.duration)
  return Promise.resolve(true)
}
```

This publisher is used like so:

```javascript
// as the first case, with just an Experiment:
var experiment = new MyExperiment('foobar')
// and continue w

// if you want to include the Scientist in the model:
SomeModel.prototype.myMethod = function (cb) {
  var experiment = this.science('myMethod', { Experiment: MyExperiment })
  // and continue with the experiment...
}
```
