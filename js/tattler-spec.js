(function(){
    function spec(q, _) {
        function makeError(message) {
            return new Error(message);
        };

        function removeTrailingComma(text) {
            var trimmed = text.trim();
            return _.last(trimmed) === ',' ? trimmed.substring(0,trimmed.length-1) : trimmed;
        };

        function describeArray(value) {
            return removeTrailingComma(_.foldl(value, function(total, current){
                return total + describe(current)+", ";
            }, "["))+"]";
        };

        function describeObject(value) {
            return removeTrailingComma(_.foldl(_.pairs(value), function(total, current){
                return total + current[0]+":"+describe(current[1])+", ";
            }, "{"))+"}";
        };

        function describe(value) {
            if(_.isArray(value)) {
                return describeArray(value);
            }
            if(_.isObject(value)) {
                return describeObject(value)
            }
            return ""+value;
        };

        var asserts = {
            
            equals:function(actual, expected){
                return _(expected).isEqual(actual)? 
                    q.resolve(actual) : 
                    q.reject(makeError("expected:\n"+describe(actual)+"\nto be:\n"+describe(expected)));
            },
            all:function(){
                return q.all(_.toArray(arguments));
            }
        };

        function makeSpec(name, specs){
            return specs;
        };
        makeSpec.assert = asserts;
        return makeSpec;
    }

    if (typeof define !== 'undefined') {
        define(['q', 'lodash'], spec);
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = spec(require('q'), require('lodash'));
    }
})();
