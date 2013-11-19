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

    var task = function(id, deps, fn) {
        if(fn === undefined) {
            fn = deps;
            deps = [];
        }
        var run = function(){
            return fn();
        }
        run.id = id;
        return run;
    };
    
    var resolveJobStream = function(jobs) {
        if(streams.isCons(jobs)) {
            return jobs;
        };
        str = streams.stream();
        result = str.read.next();
        if(_.isArray(jobs)) {
            _.each(jobs, str.push);
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

    var run = function(jobs){ 
        return Q.when(jobs).then(function(resolvedJobs) {
            var stream = resolveJobStream(resolvedJobs);
            return streamsFn.map(stream, function(job){
                if(job) {
                    var name = job.id || job.name;
                    var result = job();
                    return Q.when(result).
                        then(
                            function(res){
                                return {name:name, passed:true, result:res};
                            },
                            function(res){
                                return {name:name, passed:false, result:res}
                            })
                }
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
    define(['q', 'lodash', 'streams', 'streams-fn'], tattler);
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = tattler(
        require('q'), 
        require('lodash'), 
        require('./streams'), 
        require('./streams-fn'));
};
