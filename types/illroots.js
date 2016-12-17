/* global require, module */

var social = require('../modules/social');
var async = require('async');
var cheerio = require('cheerio');

var request = require('../modules/request');

module.exports = {
  re: /^(https?:\/\/)?(www\.)?illroots.com\/?$/i,

  init: function(opts) {
    return {

      type: 'illroots',

      getLogo: function() {
	return 'http://illroots.com/uploads/sites/1/mobile_logo/1384527988/original.png';
      },

      getTitle: function() {
	return 'Illroots';
      },

      build: function(source, cb) {
	opts.log.debug('building source')
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
	opts.log.debug('building post:', entry.url)
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

	var posts = $('#home-posts-list .posts-list article:not(.ad-item)').map(function() {
	  var a = $(this).find('header .title a');
	  var title = a.text();
	  var looks = $(this).find('.looks').text();
	  looks = looks.replace('LOOKS', '').replace(',', '');
	  looks = parseInt(looks, 10) || 0;

	  return {
	    title: title,
	    content_url: "",
	    score: looks,
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
