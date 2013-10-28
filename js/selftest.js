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

Q.when(tattler.run(
    [passingSpec,
     failingSpec],
    function(result){
        return result;
    }
)).
progress(function(progress){console.log("progress",progress);}).
done(function(theResult){
    assert.equal(theResult[0].passed, true);
    assert.equal(theResult[0].name, 'simple test');
    assert.equal(theResult[0].result, 'result');

    assert.equal(theResult[1].passed, false);
    assert.equal(theResult[1].name, 'failing test');
    assert.equal(theResult[1].result, 'error');
});
