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
                    console.log("pair: ", pair);
                    return task(pair[0], pair[1]);
                }
            );
        }
        console.log("jobs must be array or stream ", jobs);
        throw Error("Jobs must be array or stream!");
    };

    function name(job) {
        return job.name || job.id;
    }

    var run = function(jobs){ 
        return Q.when(jobs).then(function(resolvedJobs) {
            var stream = resolveJobStream(resolvedJobs);
            return streamsFn.map(stream,
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
