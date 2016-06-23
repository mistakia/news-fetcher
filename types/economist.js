/* global require, module */

var social = require('../modules/social');
var async = require('async');
var cheerio = require('cheerio');

var request = require('../modules/request');

module.exports = {
    re: /^(https?:\/\/)?(www\.)?economist.com\/?$/i,

    init: function(opts) {
	return {

	    type: 'economist',

	    getLogo: function() {
		return 'https://cdn.static-economist.com/sites/all/themes/econfinal/images/svg/logo.svg';
	    },

	    getTitle: function() {
		return 'The Economist';
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

		var posts = $('#homepage-center-inner section article').map(function() {
		    var a = $(this).find('a');
		    var title = a.find('.headline').text();
		    var comments = a.find('.comment-icon').text();
		    console.log(comments);
		    comments = parseInt(comments, 10) || 0;
		    var url = a.attr('href');

		    return {
			title: title,
			content_url: null,
			score: comments,
			url: url.charAt(0) === '/' ? ('http://www.economist.com' + url) : url
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
