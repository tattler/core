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
    deferred.promise.name="simple test";
    deferred.reject("error");
    return deferred.promise;
}

Q.when(tattler.run(
    [passingSpec,
     failingSpec],
    function(result){
        return result;
    }
)).done(function(theResult){
    theResult.forEach(function(result) {
        process.stdout.write(result.passed ? '.' : 'e');

    });
    console.log("");
});
