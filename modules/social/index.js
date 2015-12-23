var request = require('domain-request');
var async = require('async');

var SocialScore = function(url, cb) {
    async.parallelLimit({
	facebook: FacebookScore(url),
	//twitter: TwitterScore(url),
	reddit: RedditScore(url),
	linkedin: LinkedInScore(url),
	stumbleupon: StumbleUponScore(url),
	googleplus: GooglePlusScore(url),
	pinterest: PinterestScore(url),
	vkontakte: VKScore(url)
    }, 3, function(err, result) {

	var total = 0;
	for (key in result) {
	    for (v in result[key]) {
		total += result[key][v];
	    }
	}
	result.total = total;
	cb(err, result);

    });
};

var FacebookScore = function(url) {
    return function(cb) {
	var fbUrl = 'https://api.facebook.com/method/fql.query?format=json&query=' + encodeURIComponent('SELECT share_count, like_count, comment_count, commentsbox_count, click_count FROM link_stat WHERE url="' + url + '"');

	request({
	    url: fbUrl,
	    json: true
	}, function(err, res, body) {
	    cb(err, body[0]);
	});
    };
};

var TwitterScore = function(url) {
    return function(cb) {
	var twUrl = 'http://cdn.api.twitter.com/1/urls/count.json?url=' + encodeURIComponent(url);
	request({
	    url: twUrl,
	    json: true
	}, function(err, res, body) {
	    var result = { count: 0 };
	    if (!err && res.statusCode === 200) {
		result.count = body.count;
	    }
	    cb(err, result);
	});
    };
};

var RedditScore = function(url) {
    return function(cb) {
	var redditUrl = 'http://www.reddit.com/api/info.json?url=' + encodeURIComponent(url);

	request({
	    url: redditUrl,
	    json: true
	}, function(err, res, body) {
	    var result = {
		comments: 0,
		score: 0
	    };

	    if (body && body.data && body.data.children) {
		body.data.children.forEach(function(item) {
		    result.score += item.data.score;
		    result.comments += item.data.num_comments;
		});
	    }
	    cb(err, result);
	});
    };
};

var LinkedInScore = function(url) {
    return function(cb) {
	var lnUrl = 'http://www.linkedin.com/countserv/count/share?format=json&url=' + encodeURIComponent(url);
	request({
	    url: lnUrl,
	    json: true
	}, function(err, res, body) {
	    var result = { count: 0 };
	    if (!err && res.statusCode === 200 && body && body.count) {
		result.count = body.count;
	    }
	    cb(err, result);
	});
    };
};

var StumbleUponScore = function(url) {
    return function(cb) {
	var stumbleUrl = 'http://www.stumbleupon.com/services/1.01/badge.getinfo?url=' + encodeURIComponent(url);
	request({
	    url: stumbleUrl,
	    json: true
	}, function(err, res, body) {
	    var result = { views: 0 };
	    if (!err && res.statusCode === 200 && body.result && body.result.in_index) {
		result.views = parseInt(body.result.views, 10);
	    }
	    cb(err, result);
	});
    };
};

var GooglePlusScore = function(url) {
    return function(cb) {
	var googleUrl = 'https://plusone.google.com/_/+1/fastbutton?count=true&url=' + encodeURIComponent(url);

	request({
	    url: googleUrl,
	    json: true
	}, function(err, res, body) {
	    var result = { count: 0};
	    if (!err && res.statusCode === 200) {
		var count = /window.__SSR = {c: ([^,]*),/ig.exec(body);
		result.count = count ? parseInt(count[1], 10) : 0;
	    }
	    cb(err, result);
	});
    };
};

var PinterestScore = function(url) {
    return function(cb) {
	var pinUrl = 'http://api.pinterest.com/v1/urls/count.json?url=' + encodeURIComponent(url);

	request({
	    url: pinUrl
	}, function(err, res, body) {
	    var json;
	    var result = { count: 0 };
	    if (!err && res.statusCode === 200) {
		var startPos = body.indexOf('({');
		var endPos = body.indexOf('})');
		var jsonString = body.substring(startPos+1, endPos+1);
		try {
		    json = JSON.parse(jsonString);
		    if (json.count) result.count = json.count;
		} catch(e) {
		    
		}
	    }
	    cb(err, result);
	});
    };
};

var VKScore = function(url) {
    return function(cb) {
	var vkUrl = 'http://vk.com/share.php?act=count&index=1&url=' + encodeURIComponent(url);

	request({
	    url: vkUrl,
	    json: true
	}, function(err, res, body) {
	    var result = { count: 0 };
	    if (!err && res.statusCode === 200) {
		try {
		    result.count = parseInt(/^VK\.Share\.count\(1, (\d+)\);$/ig.exec(body)[1], 10);
		} catch(e) {
		    console.log(e);
		}
	    }
	    cb(err, result);
	});
    };
};	    

module.exports = {
    all: SocialScore
};
