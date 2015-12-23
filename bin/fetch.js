var Fetcher = require('../index');
var async = require('async');

var source = {
    url: process.argv[2]
};

var fetcher = Fetcher(source.url, {log: console});

async.series([
    fetcher.build.bind(fetcher)
    //fetcher.getPosts.bind(fetcher)
], function(err) {
    if (err) console.log(err);
    console.log(fetcher.source);

    process.exit();
});
