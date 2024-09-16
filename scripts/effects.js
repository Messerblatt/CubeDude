window.song = new Pz.Sound()

window.flanger = new Pizzicato.Effects.Flanger({
  time: 0.1,
  speed: 0.2,
  depth: 1,
  feedback: 0.75,
  mix: 1 
});

window.reverb = new Pizzicato.Effects.Reverb({
  time: 2,
  decay: 0.01,
  reverse: false,
  mix: 0.5
});

window.tremolo = new Pizzicato.Effects.Tremolo({
  speed: 10,
  depth: 1,
  mix: 1
});

window.lowPassFilter = new Pizzicato.Effects.LowPassFilter({
  frequency: 400,
  peak: 8
});

window.distortion = new Pizzicato.Effects.Distortion({
  gain: 0.4
});

window.delay = new Pizzicato.Effects.Delay({
  feedback: 0.6,
  time: 0.3,
  mix: 0.5
});

window.effects = {
  "flanger": {"ref": window.flanger, "set" : false},
  "reverb": {"ref": window.reverb, "set": false},
  "tremolo": {"ref": window.tremolo, "set": false},
  "lowPassFilter": {"ref": window.lowPassFilter, "set": false},
  "distortion": {"ref": window.distortion, "set": false},
  "delay": {"ref": window.delay, "set": false},
  "active" : []
};
