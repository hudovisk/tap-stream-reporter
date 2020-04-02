/**
 * @summary
 * This Filter based on `mocha-clean` module.(see: `github.com/rstacruz/mocha-clean`)
 * @description
 * When invoking this function you get a filter function that get the Error.stack as an input,
 * and return a prettify output.
 * (i.e: strip Mocha, node_modules, bower and componentJS from stack trace).
 * @returns {Function}
 */

module.exports = function() {
  var slash = "/",
    is = typeof document === "undefined" ? { node: true } : { browser: true },
    cwd = is.node
      ? process.cwd() + slash
      : location.href.replace(/\/[^\/]*$/, "/");

  function isNodeModule(line) {
    return ~line.indexOf("node_modules");
  }

  function isMochaInternal(line) {
    return (
      ~line.indexOf("node_modules" + slash + "tap-mocha-reporter") ||
      ~line.indexOf("components" + slash + "mochajs") ||
      ~line.indexOf("components" + slash + "mocha")
    );
  }

  // node_modules, bower, componentJS
  function isBrowserModule(line) {
    return ~line.indexOf("node_modules") || ~line.indexOf("components");
  }

  function isNodeInternal(line) {
    return (
      ~line.indexOf("(timers.js:") ||
      ~line.indexOf("(domain.js:") ||
      ~line.indexOf("(events.js:") ||
      ~line.indexOf("(node.js:") ||
      ~line.indexOf("(module.js:") ||
      ~line.indexOf("at node.js:") ||
      ~line.indexOf("GeneratorFunctionPrototype.next (native)") ||
      false
    );
  }

  return function(stack) {
    stack = stack.split("\n");

    stack = stack.reduce(function(list, line) {
      if (
        is.node &&
        (isNodeModule(line) || isMochaInternal(line) || isNodeInternal(line))
      )
        return list;

      if (is.browser && isBrowserModule(line)) return list;

      // Clean up cwd(absolute)
      list.push(line.replace(cwd, ""));
      return list;
    }, []);

    return stack.join("\n");
  };
};
