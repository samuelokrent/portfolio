// Returns a new comment form element
var CommentForm = function(file, level, parent_id) {
	return $('<div/>').addClass('temp-comment-form').css('margin-left',''+((level+1) * 20)+'px').append(
		$('<input/>').addClass('form_author').attr('type', 'text').attr('name', 'author')
			.attr('placeholder', 'Author'),
		$('<input/>').addClass('form_content').attr('type', 'text')
			.attr('name', 'content').attr('placeholder', 'Comment').attr('width', '200'),
		$('<button/>').text('Submit').click(function() {
			$.post({
				url: '/add_comment',
				data: {
					file: file,
					parent_id: parent_id,
					author: $(this).siblings('.form_author').first().val(),
					content: $(this).siblings('.form_content').first().val()
				},
				success: function() {
					loadComments();
				}
			});
			$('temp-comment-form').remove();
		})
	);
}

function loadComments() {

	$.get('/comments?path=' + $('.comments').first().data('file'),
		function(comments) {

			// Clear out old comments if there
 			$('.comments').empty();

			comments.forEach(function(comment) {
				$('.comments').append(
					$('<div/>').addClass('comment')
						.css('margin-left',''+((comment.level) * 20)+'px')
						.append(
							$('<p/>').text(
								comment.author + ': ' + comment.content +
								' (on ' + comment.created_at + ')'
							)
						).click(function() {
							// Create a new comment form when clicked
							$(this).after(CommentForm(comment.file, comment.level,
								comment.id));
						})
				);
			});

			// Add main comment form
			$('.comments').append(
				CommentForm($('.comments').first().data('file'), -1, null)
			);
		}
	);
}

$(document).ready(function() {

	loadComments();
});
