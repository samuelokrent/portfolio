var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var svn = require('./svn-parse');
var args = process.argv.slice(2);
var db = require('./database');
var fs = require('fs');

app.use(express.static('public'));
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({ 
  extended: true
}));
 
app.set('view engine', 'pug');

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/views/index.html')
});

app.get('/projects', function(req, res) {
	var path = req.query.path || '';
	var entry = svn.getFileTree().getEntry(path);
	res.render('projects', {
		entry: entry,
		getUrl: function(entry) {
			return '/projects?path=' + entry.getFullPath();
		}
	});
});

app.get('/comments', function(req, res) {
	var path = req.query.path || '';
	db.fetchCommentList(path, function(comments) {
		res.json(comments);
	});
});

app.get('/file', function(req, res) {
	var path = req.query.path || '';
	fs.readFile("./svn/" + path, function(err, data) {
		if(!err) {
			res.send(data);
		} else {
			console.error("Could not read file: " + path);
			res.send('');
		}
	});
});

app.post('/add_comment', function(req, res) {
	db.addComment(req.body.author, req.body.content,
					req.body.file, req.body.parent_id,
					function(err) {
							res.json({ success: !err });
					}
	);
});

var PORT = args.length > 0 ? args[0] : 3000;
svn.init('data/svn_list.xml', 'data/svn_log.xml', function() {
	db.init(function() {
		app.listen(PORT, function () {
			console.log('Server started on port ' + PORT);
		});
	});
});
