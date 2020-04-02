// minimal mock of mocha's Suite class for formatters

class MochaSuite {
  constructor(parent) {
    if (!parent.parent || !parent.parent.emittedSuite) this.root = true;
    else this.root = false;

    this.title = parent.name || "";
    this.suites = [];
    this.tests = [];
    this.ok = true;
  }

  fullTitle() {
    if (!this.parent) return (this.title || "").trim();
    else return (this.parent.fullTitle() + " " + (this.title || "")).trim();
  }
}

module.exports = MochaSuite;
