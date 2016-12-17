/* global require, module */

var social = require('../modules/social');
var async = require('async');

var request = require('../modules/request');

module.exports = {
  re: /^(https?:\/\/)?(www\.)?breakingnews.com\/api\/v1\/item\/?$/i,

  init: function(opts) {
    return {

      type: 'breakingnews',

      getLogo: function() {
	return 'http://static.breakingnews.com/images/logo-square.png';
      },

      getTitle: function() {
	return 'Breaking News';
      },

      build: function(source, cb) {
	opts.log.debug('building source')
	var self = this;

	request({
	  uri: this.url + '?limit=40',
	  json: true
	}, function (error, response, body) {

	  if (error) {
	    cb(error);
	    return;
	  }

	  source.title = self.getTitle();
	  source.logo_url = self.getLogo();
	  source.data = body;
	  source.feed_url = response.request.uri.href;

	  cb();
	});
      },

      buildPost: function(entry, cb) {
	opts.log.debug('building post:', entry.content_url)
	social.all(entry.content_url,  function(err, result) {
	  entry.social_score = result.total;
	  cb(err);
	});
      },

      getPosts: function(source, cb) {
	source.posts = [];

	if (!source.data) {
	  cb('missing data');
	  return;
	}

	var posts = [];

	source.data.objects.forEach(function(p) {
	  if (!p.url) return;
	  if (p.importance < 4) return;

	  posts.push({
	    content_url: p.url,
	    url: p.permalink,
	    title: p.content,
	    score: p.whoas
	  });
	});

	source.posts = posts;

	async.eachSeries(source.posts, this.buildPost.bind(this), function(err) {
	  cb(err);
	});
      }
    };
  }
};
