# tap-stream-report

This package is based on [tap-mocha-reporter](https://github.com/tapjs/tap-mocha-reporter). The reasoning behind this package is that tap-mocha-reporter is very dependent on `process.stdout` as its output, so the idea is to turn the reporter into a `Transform` stream and doing so it enables us to pipe it's output to whatever destination we like.

## Currently supported reporters
 - spec
 - summary