// A countdown that can pause and resume with the time it had left (toasts pause on hover and focus)
const realClock = { now: () => Date.now(), set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) };

export function createTimer(ms, onDone, clock = realClock) {
  let left = ms;
  let started = clock.now();
  let done = false;
  let id = clock.set(fire, ms);
  function fire() {
    if (done) return;
    done = true;
    id = null;
    onDone();
  }
  return {
    pause() {
      if (done || id == null) return;
      clock.clear(id);
      id = null;
      left -= clock.now() - started;
    },
    resume() {
      if (done || id != null) return;
      started = clock.now();
      id = clock.set(fire, left);
    },
    remaining: () => (id == null ? left : left - (clock.now() - started)),
    cancel() {
      done = true;
      if (id != null) clock.clear(id);
    },
  };
}
