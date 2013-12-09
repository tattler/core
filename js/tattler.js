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
        str = streams.stream();
        result = str.read.next();
        if(_.isArray(jobs)) {
            _.each(jobs, 
                   function(job){
                       if(_.isArray(job)) {
                           result = resolveJobStream(job);
                       }
                       else{
                           str.push(job);
                       }
                   });
            str.close();
        }
        else if(_.isObject(jobs) && !_.isFunction(jobs)){
            _(jobs).pairs().each(function(pair){
               str.push(task(pair[0], pair[1]));
            });
            str.close();
        }
        else {
            str.push(jobs);
            str.close();
        }
        return result;
    };

    function resolvePrereqs(run, job, name, results) {
        var prereqsOk;
        if(job.prereqs) {
            var prereqResults = run(job.prereqs);
            return {
                prereqsOk: streamsFn.fold(prereqResults,
                                       function(acc, current){
                                           return Q(acc).
                                               then(function(j){
                                                   var theJob = j;
                                                   return Q(current).then(
                                                       function(result){
                                                           return result.passed ? Q.resolve(theJob) : Q.reject(theJob);
                                                       }
                                                   )
                                               })
                                       },
                                       Q.resolve(job)),
                results: streamsFn.concat(prereqResults, results)
            }
        }
        else {
           return  {
               prereqsOk:Q.resolve(job),
               results:results
           }
        }
    }

    var run = function(jobs){ 
        return Q.when(jobs).then(function(resolvedJobs) {
            var stream = resolveJobStream(resolvedJobs);
            return  streamsFn.flatMap(stream, function(job){
                var reportResults = streams.stream();
                var results = reportResults.read.next();
                if(job) {
                    var name = job.id || job.name;
                    var prereqs = resolvePrereqs(run, job, name, results);
                    results = prereqs.results;

                    Q(prereqs.prereqsOk).then(function(job){
                        var result = job();
                        reportResults.push(
                            Q.when(result).
                                then(
                                    function(res){
                                        return {name:name, passed:true, result:res};
                                    },
                                    function(res){
                                        return {name:name, passed:false, result:res}
                                    }));

                    }, function(job){
                        reportResults.push(Q.reject( {name:name, passed:'skipped'}));
                    }).fin(function(){
                        reportResults.close();
                    });
                }
                return results;
            })
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
    define(['q', 'lodash', 'streams', 'streams-fn'], tattler);
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = tattler(
        require('q'), 
        require('lodash'), 
        require('./streams'), 
        require('./streams-fn'));
};
