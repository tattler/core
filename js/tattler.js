var tattler = function(Q, _, streams, streamsFn) {
  
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

    function waitForTask(task) {
        return task();
    }

    var task = function(id, deps, fn) {
        if(fn === undefined) {
            if(_.isArray(id)) {
                fn = deps;
                deps = id;
                id = 'anonymous';
            }
            else{
                fn = deps;
                deps = [];
            }
        }
        if(_.isFunction(fn))  {
            var pending = _.map(deps, waitForTask);
            var run = function(){
                return Q.all(pending).spread(fn);
            }
            run.id = id;
            run.prereqs = deps;
            return run;
        }
        if(_.isObject(fn)) {
            return _(fn).pairs().map(function(pair){
                return(task(pair[0], deps, pair[1]));
            }).value();
        }
    };
    
    var resolveJobStream = function(jobs) {
        if(jobs === streams.EOF) {
            return streams.EOF;
        }
        if(streams.isCons(jobs)) {
            return jobs;
        };
        if(_.isArray(jobs)) {
            return resolveJobStream(streamsFn.forArray(jobs));
        }
        if(_.isFunction(jobs)){
            return streamsFn.forArray([jobs]);
        }
        if(_.isObject(jobs)) {
            return streamsFn.map(
                streamsFn.forArray(_.pairs(jobs)),
                function(pair) {
                    return task(pair[0], pair[1]);
                }
            );
        }
        console.log("jobs must be array or stream ", jobs);
        throw Error("Jobs must be array or stream! "+jobs);
    };

    function name(job) {
        return job.name || job.id;
    }

    function resolvePreReqs(stream) {
        var maybePrereqs = streams.EOF; 
        function iterate(maybeStr) {
            return Q(maybeStr).then(
                function(str){
                    if (str === streams.EOF) {
                        return streams.EOF;
                    }
                    var currentValue = streams.value(str);
                    maybePrereqs = streamsFn.seekToValue(resolveJobStream(currentValue.prereqs || []));
                    

                    return Q(streamsFn.fold(maybePrereqs,
                                          function(acc, current){
                                              return acc.concat(current)
                                          },
                                           []
                                          )).then(
                        function(prereqs) {
                            var pandp = _.map(prereqs, 
                                              function(prereq){
                                                  var deferred = Q.defer();
                                                  function runPrereq(){
                                                      return Q(prereq()).then(deferred.resolve, deferred.reject);
                                                  }
                                                  return {
                                                      task:runPrereq(),
                                                      promise: deferred.promise
                                                  }
                                              });
                            console.log("task and promise ", pandp);
                            var delegatedPrereqs = _.pick(pandp, 'task');
                            return streamsFn.concat(
                                streamsFn.forArray(delegatedPrereqs),
                                streams.cons(currentValue, 
                                        function(){
                                            return iterate(streams.next(str));
                                        }));
                        }
);
                });
        };

        return {next: function(){return iterate(streamsFn.seekToValue(stream))}};
    };

    var run = function(jobs){ 
        return Q.when(jobs).then(function(resolvedJobs) {
            var stream = resolveJobStream(resolvedJobs);
            var prereqStream = resolvePreReqs(stream);
            return streamsFn.map(prereqStream,
                          function(job){
                              return Q(job()).then(
                                  function(passed){
                                      return {
                                          passed: true,
                                          name: name(job),
                                          result: passed
                                      }
                                  },
                                  function(failed){
                                      return {
                                          name: name(job),
                                          result: failed,
                                          passed: false
                                      }
                                  }
                              );
                          });
        });
    };
    


    var res =  {
        streams:streams,
        streamsFn:streamsFn,
        task: task,
        run: run,
        progress:progress
    };
    return res;
};

if (typeof define !== 'undefined') {
    define(['q', 'lodash', 'consjs', 'fn'], tattler);
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = tattler(
        require('q'), 
        require('lodash'), 
        require('./consjs'), 
        require('./consjs/fn'));
};
