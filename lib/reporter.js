const stream = require("stream");
const Parser = require("tap-parser");
const formatters = require("./formatter");
const Suite = require("./mocha-suite");
const Test = require("./mocha-test");

class Reporter extends stream.Transform {
  constructor(type, options) {
    super(options);

    this.emittedStart = false;
    this.parser = new Parser();
    this.formatter = new formatters[type]();

    this.formatter.on("data", this.push.bind(this));
    this.formatter.on("end", super.end.bind(this));

    this.attachEvents(this.formatter, this.parser);
  }

  write() {
    if (!this.emittedStart) {
      this.emittedStart = true;
      this.formatter.emit("start");
    }

    return this.parser.write.apply(this.parser, arguments);
  }

  end() {
    return this.parser.end.apply(this.parser, arguments);
  }

  attachEvents(formatter, parser, level = 0) {
    if (level === 0) {
      parser.on("line", c => formatter.emit("line", c));
      parser.on("version", v => formatter.emit("version", v));
      parser.on("complete", res => formatter.emit("end"));
      parser.on("comment", c => formatter.emit("comment", c));
    }

    parser.emittedSuite = false;
    parser.didAssert = false;
    parser.name = parser.name || "";
    parser.doingChild = null;

    parser.on("complete", res => {
      if (res.ok) {
        return;
      }

      const fail = { ok: false, diag: {} };
      const count = res.count;
      if (res.plan) {
        const plan = res.plan.end - res.plan.start + 1;
        if (count !== plan) {
          fail.name = "test count !== plan";
          fail.diag = { found: count, wanted: plan };
        } else {
          // probably handled on child parser
          return;
        }
      } else {
        fail.name = "missing plan";
      }
      fail.diag.results = res;
      emitTest(parser, formatter, fail);
    });

    const self = this;
    parser.on("child", function(child) {
      child.parent = parser;
      self.attachEvents(formatter, child, level + 1);

      // if we're in a suite, but we haven't emitted it yet, then we
      // know that an assert will follow this child, even if there are
      // no others. That means that we will definitely have a 'suite'
      // event to emit.
      emitSuite(this, formatter);

      this.didAssert = true;
      this.doingChild = child;
    });

    parser.on("comment", function(c) {
      if (this.name || !c.match(/^# Subtest: /)) {
        return;
      }

      this.name = c.trim().replace(/^# Subtest: /, "");
    });

    // Just dump all non-parsing stuff to stderr
    parser.on("extra", function(c) {
      process.stderr.write(c);
    });

    parser.on("assert", function(result) {
      emitSuite(this, formatter);

      if (!this.doingChild) {
        this.didAssert = true;
        this.doingChild = null;

        emitTest(this, formatter, result);
        return;
      }

      // no need to print the trailing assert for subtests
      // we've already emitted a 'suite end' event for this.
      // UNLESS, there were no other asserts, AND it's root level
      const suite = this.doingChild.suite;
      if (this.doingChild.name === result.name && suite) {
        if (result.time) suite.duration = result.time;

        // If it's ok so far, but the ending result is not-ok, then
        // that means that it exited non-zero.  Emit the test so
        // that we can print it as a failure.
        if (suite.ok && !result.ok) emitTest(this, formatter, result);
      }

      let emitOn = this;
      const dc = this.doingChild;
      this.doingChild = null;

      if (!dc.didAssert && dc.level === 1) {
        emitOn = dc;
      } else if (dc.didAssert) {
        if (dc.suite) {
          formatter.emit("suite end", dc.suite);
        }
        return;
      } else {
        emitOn = this;
      }

      emitSuite(emitOn, formatter);
      emitTest(emitOn, formatter, result);
      if (emitOn !== this && emitOn.suite) {
        formatter.emit("suite end", emitOn.suite);
        delete emitOn.suite;
      }
      if (dc.suite) {
        formatter.emit("suite end", dc.suite);
      }
    });

    parser.on("complete", function(results) {
      this.results = results;
    });

    parser.on("bailout", function(reason) {
      const suite = this.suite;
      formatter.emit("bailout", reason, suite);
      if (suite) {
        this.suite = suite.parent;
      }
    });

    // proxy all stream events directly
    const streamEvents = ["pipe", "prefinish", "finish", "unpipe", "close"];

    streamEvents.forEach(function(ev) {
      parser.on(ev, function() {
        const args = [ev];
        args.push.apply(args, arguments);
        formatter.emit.apply(formatter, args);
      });
    });
  }
}

function emitSuite(parser, formatter) {
  if (parser.emittedSuite || !parser.name) {
    return;
  }

  parser.emittedSuite = true;
  const suite = (parser.suite = new Suite(parser));
  if (parser.parent && parser.parent.suite) {
    parser.parent.suite.suites.push(suite);
  }

  if (formatter.stats) {
    formatter.stats.suites++;
  }

  formatter.emit("suite", suite);
}

function emitTest(parser, formatter, result) {
  const test = new Test(result, parser);

  if (parser.suite) {
    parser.suite.tests.push(test);
    if (!result.ok) {
      for (let p = parser; p && p.suite; p = p.parent) {
        p.suite.ok = false;
      }
    }
    parser.suite.ok = parser.suite.ok && result.ok;
  }

  formatter.emit("test", test);
  if (result.skip || result.todo) {
    formatter.emit("pending", test);
  } else if (result.ok) {
    formatter.emit("pass", test);
  } else {
    const error = getError(result);
    formatter.emit("fail", test, error);
  }
  formatter.emit("test end", test);
}

function getError(result) {
  let err;

  function reviveStack(stack) {
    if (!stack) {
      return null;
    }

    return stack
      .trim()
      .split("\n")
      .map(line => "    at " + line)
      .join("\n");
  }

  if (result.diag && result.diag.error) {
    err = {
      name: result.diag.error.name || "Error",
      message: result.diag.error.message,
      toString: function() {
        return this.name + ": " + this.message;
      },
      stack: result.diag.error.stack
    };
  } else {
    err = {
      message: (result.name || "(unnamed error)").replace(/^Error: /, ""),
      toString: function() {
        return "Error: " + this.message;
      },
      stack: result.diag && result.diag.stack
    };
  }

  const diag = result.diag;

  if (err.stack) {
    err.stack = err.toString() + "\n" + reviveStack(err.stack);
  }

  if (diag) {
    const hasFound = diag.hasOwnProperty("found");
    const hasWanted = diag.hasOwnProperty("wanted");
    const hasDiff = diag.hasOwnProperty("diff");

    err.diff = hasDiff && diag.diff;
    err.actual = hasFound && diag.found;

    err.expected = hasWanted && diag.wanted;

    if ((hasFound && hasWanted) || hasDiff) {
      err.showDiff = true;
    }
  }

  return err;
}

module.exports = Reporter;
