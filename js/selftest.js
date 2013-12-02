(function() {
    {
        var specs = function(Q, tattler, assert) {
            var passingSpecBody = function(){
                var deferred = Q.defer();
                deferred.resolve("result");
                return deferred.promise;
            };

            var passingSpec =  tattler.task("simple test", passingSpecBody);

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

            var dependsOnFailingSpec = tattler.task("depends on failing", [failingSpec], function(fromDependent){
                return Q.resolve("will never happen");
            });

            var dependsOnPassingSpec = tattler.task("depends on passing", [passingSpec], function(fromDependent){
                return Q.resolve("From dependent: " + fromDependent);
            });

            var dependsOnManyPassingSpecs = tattler.task("depends on two passing", [passingSpec, passingSpecWithAName], function(fromDependent, other){
                return Q.resolve("From dependent: " + fromDependent+" and "+other);
            });

            function testRun(name, specs, expectedResults) {
                return tattler.task(name, function() {
                    return tattler.streamsFn.fold(
                        tattler.run (specs),
                        function(acc, result){
                            return Q.when(acc).then(
                                function(a){
                                    return Q.when(result).then( 
                                        function(r){
                                            a[r.name] = r;
                                            return acc;
                                        },
                                        function(error) {
                                            a[error.name] = error;
                                            return a;
                                        });
                                })
                        },
                        Q.when({})
                    ).then(function(allResults){
                        assert.deepEqual(allResults, expectedResults);
                    });
                });
            }


            tattler.streamsFn.fold(
                tattler.run([
                    testRun("spec with a name",
                            passingSpecWithAName,
                            {'passingSpecWithAName':{passed: true,
                                                     name: 'passingSpecWithAName',
                                                     result: 'a result'}}),
                    testRun("one passing",
                            passingSpec,
                            {'simple test':{
                                passed: true,
                                name: 'simple test',
                                result: 'result'}
                            }),
                    testRun("one failing",
                            failingSpec,
                            {'failing test':{passed: false,
                              name: 'failing test',
                              result: 'error'}}),
                    testRun("one passing, one failing",
                            [passingSpec,
                             failingSpec],
                            {'simple test': {passed: true,
                                             name: 'simple test',
                                             result: 'result'},
                             'failing test':{passed: false,
                                             name: 'failing test',
                                             result: 'error'}
                            }
                           ),
                    testRun("run passing spec in object",
                            {'spec one': passingSpecBody},
                            {'spec one': 
                             {
                                 passed:true,
                                 name: 'spec one',
                                 result: 'result'
                             }
                            }
                           ),
                    testRun("run failing dependent",
                            [dependsOnFailingSpec],
                            { 
                                'failing test':{
                                    passed: false,
                                    name: 'failing test',
                                    result: 'error'
                                },
                                'depends on failing': {
                                    passed:'skipped',
                                    name:'depends on failing'
                                }
                            }),
                    testRun("run passing dependent",
                            [dependsOnPassingSpec],
                            {
                                'simple test':{
                                    passed: true,
                                    name: 'simple test',
                                    result: 'result'
                                },
                                'depends on passing': {
                                    passed:true,
                                    name:'depends on passing',
                                    result: 'From dependent: result'
                                }
                            }),
                    testRun("run passing depends on many",
                            [dependsOnManyPassingSpecs],
                            {
                                'simple test':{
                                    name: 'simple test',
                                    passed: true,
                                    result: 'result'
                                },
                                'passingSpecWithAName':{
                                    name: 'passingSpecWithAName',
                                    passed: true,
                                    result: 'a result'},
                                'depends on two passing': {
                                    name:'depends on two passing',
                                    passed:true,
                                    result: 'From dependent: result and a result'
                                }
                            })
                ]),
                
                function(eventuallyAcc, eventuallyResult){
                    Q(eventuallyResult).finally(function(r){console.log("r", log)});
                    return Q.all([eventuallyAcc, eventuallyResult]).spread(
                        function(sum, current){
                            if (current.passed) {
                                sum.passed += 1;
                            }
                            else {
                                console.log("Failure: ", current);
                                sum.failed += 1;
                            }
                            return sum;
                        });
                },
                Q.when({
                    failed: 0,
                    passed: 0
                })
            ).done(function(summary){
                Q.when(summary).then(function(s){
                    console.log("summary:", s);
                });
            });
        }
    }
    if (typeof define !== 'undefined') {
	define(['q', 'tattler', 'assert-amd'], specs);
    }
    else if (typeof module !== 'undefined' && module.exports) {
        specs(
            require('q'),
            require('./tattler'),
            require('assert')
        )
    }
    else {
        function deepEqual(expected, actual, path){
            if (typeof expected !== typeof actual) {
                throw new Error(expected + " and " + actual + " in " +path+" don't have the same type");
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
            tattler(Q, _, streams, streamsFn),
            {deepEqual:deepEqual}
        )
    }
})();
