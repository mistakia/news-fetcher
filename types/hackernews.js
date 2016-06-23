/* global require, module */

var social = require('../modules/social');
var async = require('async');
var Firebase = require('firebase');
var api = new Firebase('https://hacker-news.firebaseio.com/v0');

function fetchItem(id, cb) {
    api.child('item/' + id).once('value', function(snapshot) {
	cb(null, snapshot.val());
    }, function(err) {
	cb(err);
    });
}

module.exports = {
    re: /^(https?:\/\/)?news\.ycombinator.com\/?(news)?$/i,

    init: function() {
	return {
	    type: 'hackernews',

	    getTitle: function() {
		return 'Hacker News';
	    },

	    getLogo: function() {
		return 'https://news.ycombinator.com/favicon.ico';
	    },

	    build: function(source, cb) {
		source.title = this.getTitle();
		source.logo_url = this.getLogo();
		cb();
	    },

	    buildPost: function(post, cb) {
		social.all(post.url, function(err, result) {
		    cb(err, {
			title: post.title,
			content_url: post.url || "",
			score: post.score || 1,
			social_score: result.total,			    
			url: 'https://news.ycombinator.com/item?id=' + post.id
		    });
		});
	    },

	    getPosts: function(source, cb) {
		var self = this;
		api.child('topstories').limitToFirst(100).once('value', function(snapshot) {
		    var ids = snapshot.val();

		    async.map(ids, fetchItem, function(err, stories) {
			if (err) {
			    cb(err);
			    return;
			}

			stories = stories.filter(function(story) {
			    return !!story;
			});

			async.mapSeries(stories, self.buildPost.bind(self), function(err, posts) {
			    source.posts = posts;
			    cb();
			});
		    });

		}, function(err) {
		    cb(err);
		});
	    }
	};
    }
};
