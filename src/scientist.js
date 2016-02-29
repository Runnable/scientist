import Experiment from './experiment'

class Scientist {
  science (name, opts = {}) {
    const Type = opts.Experiment || Experiment
    const experiment = new Type(name)
    experiment.context({})
    return experiment
  }
}

Scientist.Experiment = Experiment

export default Scientist
