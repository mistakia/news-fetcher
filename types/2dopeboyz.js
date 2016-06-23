/* global require, module */

var social = require('../modules/social');
var async = require('async');
var cheerio = require('cheerio');

var request = require('../modules/request');

module.exports = {
    re: /^(https?:\/\/)?(www\.)?2dopeboyz.com\/?$/i,

    init: function(opts) {
	return {

	    type: '2dopeboyz',

	    getLogo: function() {
		return 'http://2ykov18qyj81ii56523ib0ue.wpengine.netdna-cdn.com/wp-content/themes/2dopeboys/assets/img/2dopeboyz_3x.png';
	    },

	    getTitle: function() {
		return '2dopeboyz';
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

		var posts = $('#posts article .post-inner').map(function() {
		    var a = $(this).find('.post-body .entry-title a');
		    var title = a.text();
		    var footer = $(this).find('footer');
		    var dope = $(this).find('footer .rating .thumbs-rating-up').text();
		    dope = dope.replace('DOPE', '');
		    dope = parseInt(dope, 10) || 0;
		    var nope = $(this).find('footer .rating .thumbs-rating-down').text();
		    nope = nope.replace('NOPE', '');
		    nope = parseInt(nope, 10) || 0;

		    return {
			title: title,
			content_url: "",
			score: dope - nope,
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
