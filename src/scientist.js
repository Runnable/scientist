/* @flow */

import _Experiment from './experiment'

class Scientist {
  static Experiment: typeof _Experiment;

  science (name: string, opts: Object = {}): _Experiment<*> {
    const Type = opts.Experiment || _Experiment
    const experiment = new Type(name)
    experiment.context({})
    return experiment
  }
}

Scientist.Experiment = _Experiment

export default Scientist
