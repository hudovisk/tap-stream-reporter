// minimal mock of the mocha Test class for formatters

class MochaTest {
  constructor(result, parent) {
    this.result = result;
    this._slow = 75;
    this.duration = result.time;
    this.title = result.name;
    this.state = result.ok ? "pass" : "failed";
    this.pending = result.todo || result.skip || false;

    if (result.diag && result.diag.source) {
      const source = result.diag.source;
      this.fn = {
        toString: function() {
          return "function(){" + source + "\n}";
        }
      };
    }

    Object.defineProperty(this, "parent", {
      value: parent,
      writable: true,
      configurable: true,
      enumerable: false
    });
  }

  fullTitle() {
    return (this.parent.fullname + " " + (this.title || "")).trim();
  }

  slow(ms) {
    return 75;
  }

  fn = {
    toString: function() {
      return "function () {\n}";
    }
  };
}

module.exports = MochaTest;
