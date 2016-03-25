var domain = require('domain');
var cluster = require('cluster');
var request = require('requestretry');

request.Request.request.defaults({
    headers: {
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36'
    }
});

var $ = function(opts, cb) {
    opts.gzip = true;
    opts.maxAttempts = 4;
    opts.timeout = 30000;

    var d = domain.create();

    d.on('error', function(err) {
	console.log(err);
	cluster.worker.disconnect();
    });

    d.run(function() {
	request(opts, cb);
    });

};

module.exports = $;
