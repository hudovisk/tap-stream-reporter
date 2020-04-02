const BaseFormatter = require("./base-formatter");

class SummaryFormatter extends BaseFormatter {
  constructor(options) {
    // console.log("SummaryFormatter");
    super(options);

    this.on("end", this.epilogue);
  }
}

module.exports = SummaryFormatter;
