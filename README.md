# tap-stream-report

This package is based on [tap-mocha-reporter](https://github.com/tapjs/tap-mocha-reporter). The reasoning behind this package is that tap-mocha-reporter is very dependent on `process.stdout` as its output, so the idea is to turn the reporter into a `Transform` stream and doing so it enables us to read it's output to whatever destination we like.

## Currently supported reporters
 - spec
 - summary

## Usage:

```javascript
const stream = require("stream");
const util = require("util");
const Reporter = require("tap-stream-reporter");

const pipeline = util.promisify(stream.pipeline);

async function() {
  // This is necessary because if we do not invoke pipe on
  // tap it defaults to process.stdout
  const passthrough = new stream.PassThrough();
  tap.pipe(passthrough);
  
  // TESTS GO HERE
  // tap.test....;
  
  tap.end();
  
  const reporter = new Reporter("spec");
  
  // according to some maintainers, pipeline is the recommended way
  // to glue streams together
  // ref: https://www.youtube.com/watch?v=aTEDCotcn20
  await pipeline(passthrough, reporter);
  
  let report = "";
  for await (const chunk of reporter) {
    report += chunk.toString();
  }
  
  console.log(report);
}
```