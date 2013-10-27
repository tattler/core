var tattler = function(Q) {

    var run = function(jobs, result){ 
        var results = jobs.map(
            function(job){
                return Q.when(job()).
                    then(function(res){return {passed:true, result:res}},
                         function(res){return {passed:false, result:res}});
            });
        return Q.all(results).then(function(res){
            return result(res);
        });
    };


    var res =  {
        run: run
    };
    return res;
};


var res = tattler(require('q'));
exports.run = res.run;
