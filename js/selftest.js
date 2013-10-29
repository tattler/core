var Q = require('q');
var tattler = require('./tattler');
var assert = require('assert');

var passingSpec =  function(){
    var deferred = Q.defer();
    deferred.promise.name="simple test";
    deferred.resolve("result");
    return deferred.promise;
}

var failingSpec =  function(){
    var deferred = Q.defer();
    deferred.promise.name="failing test";
    deferred.reject("error");
    return deferred.promise;
}


function testRun(name, specs, expectedProgress, expectedResults) {
    return function() {
        var progressLog = [];
        var result = Q.when(tattler.run(specs)).
            progress(function(progress){
                progressLog = progressLog.concat(progress);
            }).
            then(function(theResult){
                assert.deepEqual(progressLog, expectedProgress);
                assert.deepEqual(theResult, expectedResults);
            });
        result.name = name;
        return result;
    }
}


Q.when(tattler.run([
    testRun("one passing",
            passingSpec,
            [tattler.progress.started('simple test'),
             tattler.progress.success('simple test')],
            [{passed: true,
              name: 'simple test',
              result: 'result'}]),
    testRun("one failing",
            failingSpec,
            [tattler.progress.started('failing test'),
             tattler.progress.failure('failing test')],
            [{passed: false,
              name: 'failing test',
              result: 'error'}]),
    testRun("one passing, one failing",
            [passingSpec,
             failingSpec],
            [tattler.progress.started('simple test'),
             tattler.progress.started('failing test'),
             tattler.progress.success('simple test'),
             tattler.progress.failure('failing test')],
            [{passed: true,
              name: 'simple test',
              result: 'result'},
             {passed: false,
              name: 'failing test',
              result: 'error'}]
           )])).
    progress(function(progress){
        if (progress.status !== 'started') {
            process.stdout.write(progress.status === 'success'? '.':'F');
        }
    }).done(function(result){
        console.log();
        var summary = result.reduce(function(previous, current) {
            var sum = previous;
            if (current.passed) {
                sum.passed += 1;
            }
            else {
                sum.failed += 0;
            }
            return sum;
        }, {passed:0, failed:0});
        result.filter(
            function(elem){
                return !elem.passed;
            }).
            forEach(function(elem) {
                console.log("failed: ", elem.name);
                console.log(elem.result);
            });
        console.log();
        console.log(summary);
    });
