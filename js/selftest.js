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
                var specResults = tattler.run (specs)
                var maybeSummary = tattler.streamsFn.fold(
                    specResults, 
                    function(acc, res){
                        return Q.all([acc, res]).spread(
                            function(resolvedAcc, resolvedRes) {
                                resolvedAcc[resolvedRes.name] = resolvedRes;
                                return resolvedAcc;
                            }
                        )
                    },
                    Q.resolve({}));
                Q(maybeSummary).done(function(summary){
                    console.log("running: ", name);
                    deepEqual(expectedResults, summary);
                    console.log("passed: ", name);
                });
            }



            testRun("spec with a name",
                    passingSpecWithAName,
                    {'passingSpecWithAName':{passed: true,
                                             name: 'passingSpecWithAName',
                                             result: 'a result'}});
            testRun("one passing",
                    passingSpec,
                    {'simple test':{
                        passed: true,
                        name: 'simple test',
                        result: 'result'}
                    });

            testRun("one failing",
                    failingSpec,
                    {'failing test':{passed: false,
                                     name: 'failing test',
                                     result: 'error'}});
/*
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
                   );
            testRun("run passing spec in object",
                    {'spec one': passingSpecBody},
                    {'spec one': 
                     {
                         passed:true,
                         name: 'spec one',
                         result: 'result'
                     }
                    }
                   );
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
                    });
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
                    });
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
                    });
            testRun("run passing object dependency",
                    [tattler.task('two-specs-in-object-with-deps', [passingSpecWithAName],{
                        'dep1':function(depr1){return Q.resolve("dep1 "+depr1)},
                        'dep2':function(depr2){return Q.resolve("dep2 "+depr2)}
                    })],
                    {
                        'passingSpecWithAName':{
                            name: 'passingSpecWithAName',
                            passed: true,
                            result: 'a result'},
                        'dep1': {
                            name:'dep1',
                            passed:true,
                            result: 'dep1 a result'
                        },
                        'dep2': {
                            name:'dep2',
                            passed:true,
                            result: 'dep2 a result'
                        }
                    });*/
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
        function deepEqual(expected, actual, path, actualParent){
            path = path || "";
            if (typeof expected !== typeof actual) {
                console.log("different types [",path,"]: ", expected, " <> ", actual);
                throw new Error(expected + " and " + actual + " in [" +path+"] don't have the same type.");
            }
            if (typeof expected === 'object') {
                var key;
                for (key in expected) {
                    deepEqual(expected[key], actual[key], (path || "") +"."+key, actual);
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
            tattler(Q, _, cons, cons.fn),
            {deepEqual:deepEqual}
        )
    }
})();
