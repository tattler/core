var tattler = function(Q, _) {
    var EOF = {
        type:"EOF"
    }

    EOF.next = function(){return Q.when(EOF)};

    var cons = function(head, tail) {
        var tail = tail;
        if (typeof tail === 'function') {
            return {
                value: head, 
                next: function(){
                    return Q.when(tail());
                }
            }
        }

        return {
            value:head, 
            next: function() {
                return Q.when(tail || EOF);
            }
        }
    };

    var next = function(val){return val.next()};
    var value =  function(val) {return val.value};
    var isCons = function(maybeCons) {return maybeCons.value && maybeCons.tail};
    var stream = function() {
        var deferredNext = Q.defer();
        var nextValue = deferredNext.promise;
        var push = function(value){
            var old = deferredNext;
            deferredNext = Q.defer();
            nextValue = old.promise;
            var result = cons(value, deferredNext.promise);
            return old.resolve(result);
        }

        return {
            push: push,
            close: function() {
                nextValue = EOF;
                deferredNext.resolve(EOF);
            },
            read: {
                next: function(){
                    return nextValue
                }
            }
        }
    }

    var each = function(nxt, callback) {
        return Q.when(nxt).then(
            function(val) {
                callback(value(val));
                if(val !== EOF) {
                    each(next(val), callback);
                }
            }
        )
    }

    var map = function(stream, fn) {
        var iteration = function(stream) {
            return Q.when(stream).then(function(resolved) {
                if(resolved === EOF) return resolved;
                return cons(
                    fn(value(resolved)), 
                    function() {
                        return iteration(next(resolved));
                    });
            });
        }
        return iteration(stream);
    }

    var nextTick = typeof(process) !== 'undefined' ? process.nextTick : function(task){
        return setTimeout(task, 0);
    }

    function status(name, status) {
        return {name:name, status:status};
    };

    var progress = {
        started: function(name){return status(name, 'started');},
        success: function(name){return status(name, 'success');},
        failure: function(name){return status(name, 'failure');}
    };
    
    var resolveJobStream = function(jobs) {
        if(isCons(jobs)) {
            return jobs;
        };
        str = stream();
        result = str.read.next();
        if(_.isArray(jobs)) {
            _.each(jobs, str.push);
            str.close();
        }
        else {
            str.push(jobs);
            str.close();
        }
        return result;
    };

    var run = function(jobs){ 
        return Q.when(jobs).then(function(resolvedJobs) {
            var stream = resolveJobStream(resolvedJobs);
            return map(stream, function(job){
                if(job) {
                    console.log("running job", job);
                    var name = job.id || job.name;
                    var result = job();
//                    deferred.notify(progress.started(name));
                    return Q.when(result).
                        then(
                            function(res){
  //                              deferred.notify(progress.success(name));
                                return {name:name, passed:true, result:res};
                            },
                            function(res){
    //                            deferred.notify(progress.failure(name));
                                return {name:name, passed:false, result:res}
                            })
                }
            });
        });
    };
    
    var task = function(id, fn) {
        var run = function(){
            return fn();
        }
        run.id = id;
        return run;
    }

    var res =  {
        streams:{ stream: stream,
                 cons: cons, 
                 value: value,  
                 next: next,
                 each: each,
                 map: map
                },
        task: task,
        run: run,
        progress:progress
    };
    return res;
};

if(typeof module !== 'undefined' && module.exports) {
    module.exports = tattler(require('q'), require('lodash'));
};
