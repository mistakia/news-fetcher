/* global require, module, __dirname */

if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
	if (this == null) {
	    throw new TypeError('Array.prototype.find called on null or undefined');
	}
	if (typeof predicate !== 'function') {
	    throw new TypeError('predicate must be a function');
	}
	var list = Object(this);
	var length = list.length >>> 0;
	var thisArg = arguments[1];
	var value;

	for (var i = 0; i < length; i++) {
	    value = list[i];
	    if (predicate.call(thisArg, value, i, list)) {
		return value;
	    }
	}
	return undefined;
    };
}

var FeedParser = require('feedparser');
var fs = require('fs');
var async = require('async');
var URI = require('urijs');
var path = require('path');
var social = require('./modules/social');
var cheerio = require('cheerio');
var merge = require('merge');
var querystring = require('querystring');
var r = require('request');
var request = require('./modules/request');

var fetchers = [];

var defaultFetcher = function(opts) {
    return {

	type: 'default',

	getTitle: function(html) {
	    var $;
	    try {
		$ = cheerio.load(html);
	    } catch(e) {
		opts.log.error(e);
	    }
	    if (!$) return null;

	    var ogTitle = $('meta[property="og:title"]').attr('content');
	    if (ogTitle) return ogTitle;

	    var title = $('title');
	    return title.text() || null;
	},

	getLogo: function(html) {
	    var $;
	    try {
		$ = cheerio.load(html);
	    } catch(e) {
		opts.log.error(e);
	    }
	    if (!$) return null;

	    var og = $('meta[property="og:image"]').attr('content');
	    if (og) return og;

	    var tw = $('meta[property="twitter:image:src"]').attr('content');
	    if (tw) return tw;

	    //TODO: apple icons

	    var shortcut = $('link[rel="shortcut icon"]').attr('href');
	    if (shortcut) return shortcut;

	    var icon = $('link[rel="icon"]').attr('href');
	    if (icon) return icon;

	    return null;
	},

	discoverFeed: function(html, url) {
	    var $;
	    try {
		$ = cheerio.load(html);
	    } catch(e) {
		opts.log.error(e);
	    }
	    if (!$) return null;

	    var feedUrl = $('link[rel="alternate"][type*="rss"]').attr('href');
	    if (feedUrl && feedUrl.charAt(0) === '/')
		return new URI(feedUrl).absoluteTo(url).toString();
	    else
		return feedUrl || null;
	},

	build: function(source, cb) {
	    var self = this;

	    request({
		uri: this.url
	    }, function (error, response, body) {

		if (error) {
		    cb(error);
		    return;
		}

		var re = /^(\s)?<(\?xml|rss) version=("|')(1|2)\./i;

		source.isXML = re.test(body);
		source.feed_url = source.isXML ? response.request.uri.href : self.discoverFeed(body, self.url);
		source.logo_url = self.getLogo(body);
		source.title = self.getTitle(body);

		cb();

	    });
	},

	buildPost: function(entry, cb) {
	    var self = this;
	    var queryURL = querystring.parse(entry.link)['url'];

	    social.all(queryURL ? queryURL : entry.link, function(err, result) {
		cb(err, {
		    title: entry.title,
		    content_url: queryURL || "",
		    score: result.total,
		    social_score: result.total,
		    url: queryURL ? self.url : entry.link
		});
	    });
	},

	getPosts: function(source, cb) {

	    source.posts = [];

	    if (!source.feed_url) {
		cb();
		return;
	    }

	    var self = this;
	    var items = [];

	    var req = r(source.feed_url);
	    var feedparser = new FeedParser();

	    req.on('error', cb);

	    req.on('response', function (res) {
		if (res.statusCode !== 200) {
		    res.emit('error', new Error('Bad status code'));
		    return;
		}

		res.pipe(feedparser);
	    });

	    feedparser.on('error', cb);

	    feedparser.on('meta', function(meta) {
		if (source.isXML) source.title = meta.title;
		if (source.isXML) source.logo_url = meta.image ? meta.image.url : meta.favicon;
	    });

	    feedparser.on('end', function() {
		async.mapLimit(items, 3, self.buildPost.bind(self), function(err, results) {
		    source.posts = results;
		    cb(err);
		});
	    });

	    feedparser.on('readable', function() {
		items.push(this.read());
	    });
	}
    };
};

fs.readdirSync(path.join(__dirname, 'types')).forEach(function(file) {
    fetchers.push(require('./types/' + file));
});

var Fetcher = function(url, options) {
    var uri = new URI(url);

    url = (uri.protocol() ? uri : uri.protocol('http')).normalize().toString();

    var fetcher = fetchers.find(function(element) {
	return element.re.test(url);
    });

    if (!fetcher) fetcher = defaultFetcher(options);
    else fetcher = fetcher.init(options);

    fetcher.url = url;

    return fetcher;
};

module.exports = Fetcher;
