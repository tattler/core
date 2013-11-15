(function() {
    {
        var specs = function(Q, tattler, assert) {
            var passingSpec =  tattler.task("simple test", function(){
                var deferred = Q.defer();
                deferred.resolve("result");
                return deferred.promise;
            });

            var failingSpec =  tattler.task("failing test", function(){
                var deferred = Q.defer();
                deferred.reject("error");
                return deferred.promise;
            });
            
            function passingSpecWithAName() {
                var deferred = Q.defer();
                deferred.resolve("a result");
                return deferred.promise;
            }

            function testRun(name, specs, expectedProgress, expectedResults) {
                return tattler.task(name, function() {
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
                });
            }


            Q.when(tattler.run([
                testRun("spec with a name",
                        passingSpecWithAName,
                        [tattler.progress.started('passingSpecWithAName'),
                         tattler.progress.success('passingSpecWithAName')],
                        [{passed: true,
                          name: 'passingSpecWithAName',
                          result: 'a result'}]),
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
                        console.log("%s %s", progress.status === 'success'? '.':'F', progress.name);
                    }
                }).done(function(result){
                    tattler.streamsFn.each(result, function(value){
                        console.log("result ", value);
                    });
/*                    var summary = result.reduce(function(previous, current) {
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
                    console.log(summary);*/
                })
        }
    }
    if (typeof module !== 'undefined' && module.exports) {
        specs(
            require('q'),
            require('./tattler'),
            require('assert')
        )
    }
    else {
        function deepEqual(expected, actual, path){
            if (typeof expected !== typeof actual) {
                throw new Error(expected + " and " + actual +" don't have the same type");
            }
            if (typeof expected === 'object') {
                var key;
                for (key in expected) {
                    deepEqual(expected[key], actual[key], (path || "") +"."+key);
                }
            }
            else if (expected !== actual) {
                function AssertionError() {
                 return {name:'AssertionError',
                           path: path,
                           expected:expected,
                           actual: actual}};
                throw new AssertionError();
            }
        }
        
        specs(
            Q,
            tattler(Q),
            {deepEqual:deepEqual}
        )
    }
})();
