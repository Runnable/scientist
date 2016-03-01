/* @flow */

import Experiment from './experiment'

class Scientist {
  static Experiment: typeof Experiment;

  science (name: string, opts: Object = {}): Experiment {
    const Type = opts.Experiment || Experiment
    const experiment = new Type(name)
    experiment.context({})
    return experiment
  }
}

Scientist.Experiment = Experiment

export default Scientist
