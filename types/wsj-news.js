/* global require, module */

var social = require('../modules/social');
var async = require('async');
var cheerio = require('cheerio');

var request = require('../modules/request');

module.exports = {
    re: /^(https?:\/\/)?(www\.)?wsj.com\/news\/whats-news\/?$/i,

    init: function(opts) {
	return {

	    type: 'wsj-news',

	    getLogo: function() {
		return 'http://www.wsj.com/apple-touch-icon.png';
	    },

	    getTitle: function() {
		return 'WSJ - What\'s News';
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
		social.all(entry.url,  function(err, result) {
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

		var posts = $('.automated-news ul.items li').map(function() {
		    var a = $(this).find('.headline-container .headline a');
		    var title = a.text();

		    return {
			title: title,
			content_url: "",
			score: 1,
			url: a.attr('href')
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
