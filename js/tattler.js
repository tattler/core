

var tattler = function(Q) {
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

    var run = function(jobs){ 
        var runJobs = function(deferred) {
            if(!jobs.map) {
                jobs = [jobs];
            }
            var results = jobs.map(
                function(job){
                    var result = job();
                    deferred.notify(progress.started(result.name));
                    return Q.when(result).
                        then(
                            function(res){
                                deferred.notify(progress.success(result.name));
                                return {name:result.name, passed:true, result:res};
                            },
                             function(res){
                                 deferred.notify(progress.failure(result.name));
                                 return {name:result.name, passed:false, result:res}
                             })
                });
            Q.all(results).then(function(res){
                return deferred.resolve(res);
            });
        }
        var deferred = Q.defer();
        nextTick(function(){runJobs(deferred)});
        return deferred.promise;
    };


    var res =  {
        run: run,
        progress:progress
    };
    return res;
};

if(typeof module !== 'undefined' && module.exports) {
    module.exports = tattler(require('q'));
};
