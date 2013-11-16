(function(){
    var streamsFn = function(phloem, when) {
        var hasMore = function(xs) {
            return xs !== phloem.EOF;
        }

        var take = function(xs, count) {
            return when(xs).then(
                function(val) {
                    return (hasMore(val) && count > 0) ? 
                        phloem.cons(phloem.value(val), take(phloem.next(val), count-1)) : 
                        phloem.EOF;
                });
nnn        }

        var drop = function(xs, count) {
            return when(xs).then(
                function(val) {
                    if (hasMore(val)) {
                        return count > 0 ? 
                            drop(phloem.next(val), count -1) : val;
                    }
                    return phloem.EOF;
                });
        }

        var iterate = function(iterator, initial) {
            var iteration = function(current) {
                return phloem.cons(current, 
                                   function() {
                                       return when(iteration(iterator(current)));
                                   });
            }
            return iteration(iterator(initial));
        }

        var map = function(stream, fn) {
            var iteration = function(stream) {
                return when(stream).then(function(resolved) {
                    if(resolved === phloem.EOF) return resolved;
                    return phloem.cons(
                        fn(phloem.value(resolved)), 
                        function() {
                            return iteration(phloem.next(resolved));
                        });
                });
            }
            return iteration(stream);
        }
        
        var each = function(nxt, callback) {
            return when(nxt).done(
                function(val) {
                    if(val !== phloem.EOF) {
                        callback(phloem.value(val));
                        each(phloem.next(val), callback);
                    }
                    else {
                        callback(phloem.EOF);
                    }
                }
            )
        }

        var filter = function(next, condition) {
            var passed = stream();
            var rejected = stream();
            var doMatch = condition;
            if((typeof condition) != "function") {
                doMatch = function(val) {
                    var match = condition.exec(val)
                    return match && (match.length > 1 ? match.slice(1) : match[0])
                }
            }

            each(next, function(val) {
                var match = doMatch(val)
                if(match) {
                    passed.push(match) 
                }
                else {
                    rejected.push(val);
                }
            });
            return {
                read: {
                    next: passed.read.next,
                    unmatched: rejected.read.next
                }
            };
        }

        var fold = function(str, fn, initial) {
            var deferred = when.defer();
            var acc = initial;
            each(str, function(value){
                if(value !== phloem.EOF) {
                    acc = fn(acc, value);
                }
                else  {
                    deferred.resolve(acc);
                }
            });
            return deferred.promise;
        }

        return {
            drop: drop,
            take: take,
            iterate: iterate,
            map: map,
            each: each,
            fold: fold,
            filter: filter
        }
     }
    if(typeof define !== 'undefined') {
        return define(['streams', 'q'], streamsFn)
    }
    else if(typeof module !== 'undefined' && module.exports) {
        module.exports = streamsFn(require('./streams'), require('q'));
    }
    else {
        window.streamsFn = streamsFn(window.streams, Q);
    }

})();
