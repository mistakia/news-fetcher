/* global require, module */

var social = require('../modules/social');
var querystring = require('querystring');
var async = require('async');
var URI = require('urijs');
var util = require('util');
var cheerio = require('cheerio');

var request = require('../modules/request');

module.exports = {

    re: /^(https?:\/\/)?(www\.)?google.com\/search\?q=[^&\s]+&tbm=nws$/i,

    init: function(opts) {
	return {

	    type: 'google news',

	    getTitle: function(html) {
		var $;
		try {
		    $ = cheerio.load(html);
		} catch(e) {
		    opts.log.error(e);
		}
		if (!$) return null;

		var title = $('title');
		return title.text() || null;
	    },

	    getLogo: function(html) {
		return 'http://www.google.com/favicon.ico';
	    },

	    build: function(source, cb) {
		var self = this;

		var query = querystring.parse(source.url)['https://www.google.com/search?q'];
		var URL = 'http://www.google.com/search?hl=en&q=%s&start=0&sa=N&num=25&ie=UTF-8&oe=UTF-8&tbm=nws';
		var newURL = util.format(URL, query);

		request({
		    uri: newURL
		}, function(error, response, body) {

		    if (error) {
			cb(error);
			return;
		    }

		    source.title = self.getTitle(body);
		    source.logo_url = self.getLogo(body);
		    source.html = body;
		    source.feed_url = response.request.uri.href;

		    cb();

		});
	    },

	    buildPost: function(article, cb) {
		social.all(article.content_url, function(err, result) {
		    article.social_score = result.total;
		    cb(err);
		});
	    },

	    getPosts: function(source, cb) {
		var self = this;

		source.posts = [];

		if (!source.html) {
		    cb('missing html');
		    return;
		}

		var $ = cheerio.load(source.html);
		var links = [];
		var length = $('li.g').length;

		$('li.g').each(function(i, elem) {

		    var linkElem = $(elem).find('h3.r a');

		    if (!$(linkElem).first().text())
			return;

		    var qsObj = querystring.parse($(linkElem).attr('href'));

		    links.push({
			title: $(linkElem).first().text(),
			content_url: qsObj['/url?q'],
			score: length - i,
			url: self.url
		    });
		}).get();

		source.posts = links;

		async.eachSeries(source.posts, this.buildPost.bind(this), function(err) {
		    cb(err);
		});

	    }
	};
    }
};
