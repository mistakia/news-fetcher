/* global require, module */

var social = require('../modules/social');
var async = require('async');
var cheerio = require('cheerio');

var request = require('../modules/request');

module.exports = {
    re: /^(https?:\/\/)?(www\.)?realclearpolitics.com\/?$/i,

    init: function(opts) {
	return {

	    type: 'realclearpolitics',

	    getLogo: function() {
		return 'http://www.realclearpolitics.com/asset/img/rcp-logo-ss-red-250.gif';
	    },

	    getTitle: function() {
		return 'RealClearPolitics';
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

		    source.title = self.getTitle();
		    source.logo_url = self.getLogo();
		    source.html = body;
		    source.feed_url = response.request.uri.href;

		    cb();
		});
	    },

	    buildPost: function(entry, cb) {
		social.all(entry.content_url,  function(err, result) {
		    entry.social_score = result.total;
		    entry.score = result.total;
		    cb(err);
		});
	    },

	    getPosts: function(source, cb) {
		source.posts = [];
		
		if (!source.html) {
		    cb('missing data');
		    return;
		}

		var $ = cheerio.load(source.html);

		var posts = $('.alpha .list-view .post').map(function() {
		    var a = $(this).find('.title a');
		    var title = a.text();

		    return {
			title: title,
			content_url: a.attr('href'),
			score: 1,
			url: 'http://www.realclearpolitics.com/'
		    };
		}).get();

		source.posts = posts;

		async.eachSeries(source.posts, this.buildPost.bind(this), function(err) {
		    cb(err);
		});
	    }
	};
    }
};
