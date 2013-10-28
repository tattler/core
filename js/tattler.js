var tattler = function(Q) {

    var run = function(jobs, result){ 

        var runJobs = function(deferred) {
            var results = jobs.map(
                function(job){
                    var result = job();
                    deferred.notify({name:result.name, status:'started'});
                    return Q.when(result).
                        then(function(res){return {name:result.name, passed:true, result:res}},
                             function(res){return {name:result.name, passed:false, result:res}}).
                        fin(function(res){
                            deferred.notify({name:result.name, status:'finished'});
                            return res;});
                });
            Q.all(results).then(function(res){
                return deferred.resolve(res);
            });
        }
        var deferred = Q.defer();
        process.nextTick(function(){runJobs(deferred)});
        return deferred.promise;
    };


    var res =  {
        run: run
    };
    return res;
};


var res = tattler(require('q'));
exports.run = res.run;
