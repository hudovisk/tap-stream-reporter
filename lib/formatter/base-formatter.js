const Readable = require("stream").Readable;
const util = require("util");
const { inlineDiff, unifiedDiff } = require("../utils/diff");
const stackTraceFilter = require("../utils/stack-trace-filter");

// $1 = number, $2 = units
const TIME_RE = /^#\s*time=((?:0|[1-9][0-9]*?)(?:\.[0-9]+)?)(ms|s)?$/;

class BaseFormatter extends Readable {
  constructor(options) {
    super(options);
    this.failures = [];
    this.stats = { suites: 0, tests: 0, passes: 0, pending: 0, failures: 0 };

    this.on("start", this.onStart);
    this.on("suite", this.onSuite);
    this.on("test end", this.onTestEnd);
    this.on("pass", this.onPass);
    this.on("fail", this.onFail);
    this.on("end", this.onEnd);
    this.on("pending", this.onPending);
    this.on("comment", this.onComment);
  }

  _read() {}

  log() {
    const str = util.format.apply(this, arguments) + "\n";
    this.push(str);
  }

  onStart = () => {
    this.stats.start = new Date();
  };

  onSuite = suite => {
    suite.root || this.stats.suites++;
  };

  onTestEnd = _test => {
    this.stats.tests++;
  };

  onPass = test => {
    const medium = test.slow() / 2;
    test.speed =
      test.duration > test.slow()
        ? "slow"
        : test.duration > medium
        ? "medium"
        : "fast";

    this.stats.passes++;
  };

  onFail = (test, err) => {
    this.stats.failures++;
    test.err = err;
    this.failures.push(test);
  };

  onEnd = () => {
    this.stats.end = new Date();
    if (!this.stats.duration) {
      this.stats.duration = this.stats.end - this.stats.start;
    }
  };

  onPending = () => {
    this.stats.pending++;
  };

  onComment = comment => {
    const match = comment.trim().match(TIME_RE);
    if (match) {
      const t = +match[1];
      if (match[2] === "s") {
        t *= 1000;
      }
      if (this.stats) {
        this.stats.duration = t;
      }
    }
  };

  epilogue = () => {
    this.log();

    // passes
    const fmt = " " + " %d passing" + " (%s)";
    this.log(fmt, this.stats.passes, durationFormat(this.stats.duration));

    // pending
    if (this.stats.pending) {
      const fmt = " " + " %d pending";
      this.log(fmt, stats.pending);
    }

    // failures
    if (this.stats.failures) {
      const fmt = "  %d failing";
      this.log(fmt, this.stats.failures + "\n");
      this.failures.forEach(this.logFailure);
    }
  };

  logFailure = (failure, index) => {
    // format
    let fmt = "  %s) %s:\n" + "     %s" + "\n%s\n";

    // msg
    const err = failure.err;
    const message = err.message || "";
    let stack = err.stack || message;

    const stackIndex = stack.indexOf(message) + message.length;
    let actual = err.actual;
    let expected = err.expected;
    let escape = true;
    let msg = stack.slice(0, stackIndex);

    // uncaught
    if (err.uncaught) {
      msg = "Uncaught " + msg;
    }
    // explicitly show diff
    if (err.showDiff && sameType(actual, expected)) {
      if ("string" !== typeof actual) {
        escape = false;
        err.actual = actual = JSON.stringify(actual);
        err.expected = expected = JSON.stringify(expected);
      }

      fmt = "  %s) %s:\n%s" + "\n%s\n";
      const match = message.match(/^([^:]+): expected/);
      msg = "\n      " + (match && match[1]) || msg;

      if (exports.inlineDiffs) {
        msg += inlineDiff(err, escape);
      } else {
        msg += unifiedDiff(err, escape);
      }
    }

    // indent stack trace without msg
    stack = stackTraceFilter()(
      stack.slice(stackIndex ? stackIndex + 1 : stackIndex).replace(/^/gm, "  ")
    );

    this.log(fmt, index + 1, failure.fullTitle(), msg, stack);
  };
}

BaseFormatter.symbols = {
  ok: "✓",
  err: "✖",
  dot: "․"
};

function sameType(a, b) {
  a = Object.prototype.toString.call(a);
  b = Object.prototype.toString.call(b);
  return a == b;
}

const s = 1000;
const m = s * 60;
const h = m * 60;
const d = h * 24;
const y = d * 365.25;

function durationFormat(ms) {
  if (ms >= d) return Math.round(ms / d) + "d";
  if (ms >= h) return Math.round(ms / h) + "h";
  if (ms >= m) return Math.round(ms / m) + "m";
  if (ms >= s) return Math.round(ms / s) + "s";
  return ms + "ms";
}

module.exports = BaseFormatter;
