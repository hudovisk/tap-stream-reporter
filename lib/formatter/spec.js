const BaseFormatter = require("./base-formatter");

class SpecFormatter extends BaseFormatter {
  constructor(options) {
    super(options);

    this.indents = 0;

    this.on("start", this.onStart);
    this.on("suite", this.onSuite);
    this.on("suite end", this.onSuiteEnd);
    this.on("pending", this.onPending);
    this.on("pass", this.onPass);
    this.on("fail", this.onFail);
    this.on("end", this.epilogue);
  }

  indent() {
    return Array(this.indents).join("  ");
  }

  onStart = () => {
    this.log();
  };

  onSuite = suite => {
    ++this.indents;
    this.log("%s%s", this.indent(), suite.title);
  };

  onSuiteEnd = suite => {
    --this.indents;
    if (1 == this.indents) {
      this.log();
    }
  };

  onPending = test => {
    const fmt = this.indent() + "  - %s";
    this.log(fmt, test.title);
  };

  onPass = test => {
    if ("fast" == test.speed) {
      var fmt = this.indent() + "  " + BaseFormatter.symbols.ok + " %s\r";
      this.log(fmt, test.title);
    } else {
      var fmt =
        this.indent() + "  " + BaseFormatter.symbols.ok + " %s" + " (%dms)\r";
      this.log(fmt, test.title, test.duration);
    }
  };

  onFail = (test, _err) => {
    this.log(
      "\r" + this.indent() + "  %d) %s",
      this.stats.failures,
      test.title
    );
  };
}

module.exports = SpecFormatter;
