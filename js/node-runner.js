var tattler = require('./tattler');
var q = require('q');
var _ = require('lodash');
module.exports.run = function(specs) {
        var results = tattler.run(specs);
        var summary = tattler.streamsFn.fold(results, function(acc, current){
            return q([acc, current]).spread(function(racc, rcurrent){
                function skippedOrPassed(value) {
                    return tattler.isSkipped(value) ? 'S' : '.';
                }
                process.stdout.write(rcurrent.passed ? skippedOrPassed(rcurrent) : 'E');
                if(rcurrent.passed) {
                    if(tattler.isSkipped(rcurrent)) {
                        racc.skipped = racc.skipped.concat([rcurrent]);
                    }
                    else {
                        racc.passed = racc.passed + 1;
                    }
                }
                else {
                    racc.failed = racc.failed.concat([rcurrent]);
                }
                return racc;
            });
        }, q({
            skipped: [],
            failed: [],
            passed: 0
        }));
        
        summary.done(function(rsummary){
            process.stdout.write('\n');
            _.each(rsummary.failed, function(res){
                process.stdout.write(''+res.name);
                process.stdout.write(': ');
                process.stdout.write(''+res.result)
                process.stdout.write('\n');
                if(res.result.stack){
                    process.stdout.write(res.result.stack);
                    process.stdout.write('\n');
                }
            });
            process.stdout.write('passed: ');
            process.stdout.write(''+rsummary.passed);
            process.stdout.write('\n');
            process.stdout.write('failed: ');
            process.stdout.write(''+rsummary.failed.length);
            process.stdout.write('\n');
            process.stdout.write('skipped: ');
            process.stdout.write(''+rsummary.skipped.length);
            process.stdout.write('\n');
        });
};
