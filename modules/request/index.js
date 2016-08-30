var request = require('requestretry');
var domain = require('domain');
var once = require('once')

request.Request.request.defaults({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36'
  }
});

var $ = function(opts, cb) {
  var d = domain.create();

  cb = once(cb);

  d.on('error', function(err) {
    cb(err);
  });

  d.run(function() {
    request(opts, cb);
  });
};

module.exports = $;
