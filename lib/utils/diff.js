const escapeInvisibles = line =>
  line
    .replace(/\t/g, "<tab>")
    .replace(/\r/g, "<CR>")
    .replace(/\n/g, "<LF>\n");

const cleanUp = escape => line => {
  const indent = "      ";

  if (escape) {
    line = escapeInvisibles(line);
  }
  if (line[0] === "+") return indent + line;
  if (line[0] === "-") return indent + line;
  if (line.match(/\@\@/)) return null;
  if (line.match(/\\ No newline/)) return null;
  else return indent + line;
};

function notBlank(line) {
  return line != null;
}

function errorDiff(err, type, escape) {
  var actual = escape ? escapeInvisibles(err.actual) : err.actual;
  var expected = escape ? escapeInvisibles(err.expected) : err.expected;
  return diff["diff" + type](actual, expected)
    .map(function(str) {
      if (str.added) return colorLines("diff added", str.value);
      if (str.removed) return colorLines("diff removed", str.value);
      return str.value;
    })
    .join("");
}

function unifiedDiff(err, escape) {
  const lines = err.diff
    ? err.diff.split("\n").slice(2)
    : diff
        .createPatch("string", err.actual, err.expected)
        .split("\n")
        .slice(4);

  return (
    "\n      " +
    "+ expected" +
    " " +
    "- actual" +
    "\n\n" +
    lines
      .map(cleanUp(escape))
      .filter(notBlank)
      .join("\n")
  );
}

function inlineDiff(err, escape) {
  var msg = errorDiff(err, "WordsWithSpace", escape);

  // linenos
  var lines = msg.split("\n");
  if (lines.length > 4) {
    var width = String(lines.length).length;
    msg = lines
      .map(function(str, i) {
        return pad(++i, width) + " |" + " " + str;
      })
      .join("\n");
  }

  // legend
  msg =
    "\n" +
    color("diff removed", "actual") +
    " " +
    color("diff added", "expected") +
    "\n\n" +
    msg +
    "\n";

  // indent
  msg = msg.replace(/^/gm, "      ");
  return msg;
}

exports.unifiedDiff = unifiedDiff;
exports.errorDiff = errorDiff;
exports.inlineDiff = inlineDiff;
