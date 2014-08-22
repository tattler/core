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

    function runTask(task) {
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
            var run = fn;
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
            return streamsFn.flatten(
                streamsFn.map(
                    streamsFn.forArray(jobs),
                    resolveJobStream
                ));
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

    var TATTLER_SKIPPED = '__TATTLER__SKIPPED';

    function dumpStream(stream) {
        console.log("[start dump]");
        streamsFn.each(stream, function(element){
            console.log("e: ", element);
        }, function(){
            console.log("[end dump]");
        });
        

    }

    function log(prepend){
        return function(value){
            console.log(prepend, value);
            return value;
        }
    }

    function resolvePreReqs(stream) {
        var result = streamsFn.flatMap(stream, function(task){
            var deferredPrereqResults = _.map(task.prereqs, function(prereq){
                var deferred = Q.defer();
                deferred.id = name(prereq);
                return deferred;
            });

            var deferreds = {};
            _.each(deferredPrereqResults, function(deferred){
                deferreds[deferred.id] = deferred;
            });

            
            var prereqResults = _.pluck(deferredPrereqResults, 'promise');

            var pendingTask = function(){
                return Q.all(prereqResults).then(
                    log("success: "),
                    log("failure : ")).spread(task);
            }
            pendingTask.id = name(task);
            pendingTask.prereqs = [];

            var prereqProbes = _.map(task.prereqs, function(prereq){
                var prereqProbe = function(){
                    return Q(prereq()).then(
                        function(result) {
                            console.log("resolved = ", result);
                            return deferreds[name(prereq)].resolve(result);
                        },
                        function(error){
                            console.log("error = ", result);
                            return deferreds[name(prereq)].reject(error);
                        }
                    );
                };
                prereqProbe.id = name(prereq);
                prereqProbe.prereqs = prereq.prereqs;
                return prereqProbe;
            });
            console.log("prereqProbes: ", prereqProbes, pendingTask);
            return streamsFn.forArray(prereqProbes.concat([pendingTask]));
        });
        return result;
    };

    function isSkipped(status) {
        return _.has(status, TATTLER_SKIPPED);
    };

    var run = function(jobs){ 
        return Q.when(jobs).then(function(resolvedJobs) {
            var stream = resolveJobStream(resolvedJobs);
            var prereqStream = resolvePreReqs(stream);
            dumpStream(prereqStream);
            return streamsFn.map(prereqStream,
                          function(job){
                              console.log("running job ", name(job));

                              return Q(job()).then(
                                  function(passed){
                                      return {
                                          passed: true,
                                          name: name(job),
                                          result: passed
                                      };
                                  },
                                  function(failed){
                                      if(isSkipped(failed)) {
                                          return {
                                              name:name(job),
                                              passed:'skipped',
                                              result:failed[TATTLER_SKIPPED]
                                          }
                                      }
                                          
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
        require('consjs'), 
        require('consjs/fn'));
};
