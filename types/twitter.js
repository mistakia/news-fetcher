/* global require, module */

var social = require('social');
var async = require('async');
var URI = require('urijs');
var cheerio = require('cheerio');

var request = require('domain-request');

module.exports = {
    re: /^(https?:\/\/)?(www\.)?twitter.com\/[A-Za-z0-9_]{1,20}\/?$/i,

    init: function(opts) {
	return {

	    type: 'twitter',

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
		var $;
		try {
		    $ = cheerio.load(html);
		} catch(e) {
		    opts.log.error(e);
		}
		if (!$) return null;

		var url = $('.ProfileAvatar-image').attr('src');

		return url || null;
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

		    source.title = self.getTitle(body);
		    source.logo_url = self.getLogo(body);
		    source.html = body;
		    source.feed_url = response.request.uri.href;

		    cb();

		});
	    },

	    buildPost: function(tweet, cb) {
		social.all(tweet.content_url || tweet.url,  function(err, result) {
		    tweet.social_score = result.total;
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

		var tweets = $('li.js-stream-item[data-item-type="tweet"][data-item-id]').map(function() {

		    var tweet = $(this).find('p.tweet-text');		    
		    var content_url = tweet.find('a[data-expanded-url]').attr('data-expanded-url');

		    if (!content_url)
			return undefined;

		    var id = $(this).attr('data-item-id');
		    var fav_count = $(this).find('.js-actionFavorite:first-of-type .ProfileTweet-actionCountForPresentation').text();
		    fav_count = fav_count ? parseInt(fav_count, 10) : 0;
		    var retweet_count = $(this).find('.js-actionRetweet:first-of-type .ProfileTweet-actionCountForPresentation').text();
		    retweet_count = retweet_count ? parseInt(retweet_count, 10) : 0;

		    return {
			title: tweet.text(),
			content_url: content_url,
			score: (fav_count + retweet_count) || 1,
			url: new URI(self.url).segment(1, 'status').segment(2, id).toString()
		    };
		}).get();

		source.posts = tweets;

		async.eachLimit(source.posts, 2, this.buildPost.bind(this), function(err) {
		    cb(err);
		});
	    }
	};
    }
};
