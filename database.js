exports.init = init;
exports.addComment = addComment;
exports.fetchComments = fetchComments;
exports.fetchCommentList = fetchCommentList;
exports.sanitizeInputs = sanitizeInputs;
exports.deleteAllComments = deleteAllComments; // For testing purposes

var mysql = require('mysql');
var db;
var isTest = false;

function getDBName() {
	return (isTest ? 'portfolio_test' : 'portfolio');
}

/**
 * Initialize connection to database,
 * and create necessary tables if they don't exist
 *
 * @param {Boolean} test Whether this is a test environment
 */
function init(callback, test) {

	isTest = test;

	db = mysql.createConnection({
		host	 : 'localhost',
		user	 : 'root',
		password : '',
		database : getDBName()
	});

	db.connect(function(err) {
		if(handle(err)) 
			callback(err);
		else {
			createRedFlagsIfNecessary(function() {
				createCommentsTableIfNecessary(callback);
			});
		}
	});
}

/**
 * Check is comments table exists, and creates if not
 */
function createCommentsTableIfNecessary(callback) {
	db.query(
		'select count(*) as num from information_schema.tables ' +
		'where table_schema="' + getDBName() + '" and table_name="comments";',

		function(err, rows) {
			if(handle(err)) callback(err);
			else if(rows[0].num == 0) {
				console.log("Creating comments table");
				createCommentsTable(callback);
			} else {
				callback();
			}
		}
	);
}

/**
 * Creates a table for comments in the database
 */
function createCommentsTable(callback) {
	db.query(
		"create table comments( " +
			"id int auto_increment," +
			"primary key (id), " +
			"author varchar(50), " +
			"content varchar(200), " +
			"file varchar(200), " +
			"created_at datetime default current_timestamp, " +
			"parent_id int, " +
			"constraint foreign key (parent_id) " +
			"references comments (id) on delete cascade, " +
			"index (file));",
		callback
	);
}

/**
 * Checks if red flags table exists, and creates if not
 */
function createRedFlagsIfNecessary(callback) {
	db.query(
		'select count(*) as num from information_schema.tables ' +
		'where table_schema="' + getDBName() + '" and table_name="red_flags";',
		function(err, rows) {
			if(handle(err)) callback(err);
			else if(rows[0].num == 0) {
				console.log("Creating red_flags table");
				createRedFlagsTable(callback);
			} else {
				callback();
			}
		}
	);
}

/**
 * Creates a table for red flags and their replacements in the database
 * and adds some default red flags	 
 */
function createRedFlagsTable(callback) {
	db.query(
		"create table red_flags( " +
			"word varchar(50), " +
			"replacement varchar(50)); ",
		function() {
			addRedFlag("red1", "RED1", function() {
			addRedFlag("red2", "RED2", function() {
			addRedFlag("red3", "RED3", function() {
			addRedFlag("red4", "RED4", function() {
			addRedFlag("red5", "RED5", function() {
				callback();
			})})})})});
		}
	);
}

/**
 * Adds a red flag and associated replacement in the database
 */
function addRedFlag(word, replacement, callback) {
	db.query(
		"insert into red_flags (word, replacement) " +
		"values (?, ?);",
		[word, replacement],
		callback
	);
}

/**
 * Deletes all comments from database
 * Only meant to be called on test database
 */
function deleteAllComments(callback) {
	if(!isTest) {
		callback();
	} else {
		db.query(
			'drop table comments;',
			function() {
				createCommentsTable(callback);
			}
		);
	}
}

/**
 * Database error handler
 */ 
function handle(err) {
	if(err) {
		console.error('Database error: ' + err.stack);
	}
	return err;
}

/**
 * Sanitizes user inputs to guard against SQL injection and XSS
 * @param {Array[String]} inputs A list of user inputs
 */
function sanitizeInputs(inputs, callback) {

	// replaceAll idea found here 
	// http://cwestblog.com/2011/07/25/javascript-string-prototype-replaceall/

	db.query(

		"select * from red_flags;",

		function(err, red_flags) {
			callback(inputs.map(function(input) {

				if(!input || (typeof input) != "string") return input;

				// Escape HTML tags
				var sanitized = input.split('<').join('&lt;')
										.split('>').join('&gt;');
				if(!err) {
					// Replace red flags
					red_flags.forEach(function(red_flag) {
						sanitized = sanitized.split(red_flag.word)
							.join(red_flag.replacement);
					});
				}

				return sanitized;
			}));
		}
	);
}

/**
 * Adds a comment to the database
 *
 * @param {String} author The author of the comment
 * @param {String} content The content of the comment
 * @param {String} file The file the comment belongs to
 * @param {Integer} parent_id The id of the parent comment, or null if root level
 */
function addComment(author, content, file, parent_id, callback) {

	// Sanitize input for HTML and red flags
	sanitizeInputs([author, content, (parent_id || null), file], function(sanitized) {

		// '?' syntax escapes input to prevent SQL injection
		db.query(
			"insert into comments (author, content, parent_id, file) values " +
			"(?, ?, ?, ?);",
			sanitized,
			(callback || handle)
		);
	});	
}

/**
 * Fetches a tree of comment objects for the specified file
 */
function fetchComments(file, callback) {
	db.query(

		"select * from comments where file=? order by created_at;", [file],

		function(err, rows) {

			if(handle(err)) {
				callback(err);

			} else {

				// Create a mapping from parent id to child comments
				parent_map = {};
				rows.forEach(function(row) {
					if(!parent_map[row.parent_id]) parent_map[row.parent_id] = [];
					parent_map[row.parent_id].push(row); 

					if(!parent_map[row.id]) parent_map[row.id] = [];
					row.comments = parent_map[row.id];
				});

				// Return a list of roots of comment trees
				var topLevelComments = 
					rows.filter(function(comment) { return comment.parent_id == null; });
				callback(topLevelComments);
			}
		}
	);
}

/**
 * @param {String} file The file whose comments should be fetched
 *
 * @return A list of comment objects with tree structure
 * represented by relative ordering and level attributes of each comment
 */
function fetchCommentList(file, callback) {

	// A helper function to flatten out a tree of comments
	function convertSubtreesToList(root) {
		comments = [];
		var level = root.level + 1;
		for(var i = 0; i < root.comments.length; i++) {
			var subtree = root.comments[i];
			subtree.level = level;
			comments.push(subtree);
			comments = comments.concat(convertSubtreesToList(subtree));
			subtree.comments = null;
		}
		return comments;
	}

	fetchComments(file, function(comment_trees) {
		var root = { level: -1, comments: comment_trees };
		callback(convertSubtreesToList(root));
	});
}
