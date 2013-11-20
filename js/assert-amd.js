define([], function (){
    var deepEqual = function(expected, actual, path) {
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
    return {
	deepEqual: deepEqual
    }
});
