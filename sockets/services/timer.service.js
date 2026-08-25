class TimerService {
  setTimeout(callback, delay) {
    return setTimeout(callback, delay);
  }

  setInterval(callback, delay) {
    return setInterval(callback, delay);
  }

  clearTimeout(timer) {
    clearTimeout(timer);
  }

  clearInterval(timer) {
    clearInterval(timer);
  }
}

module.exports = TimerService;
