$(function() {
	var FADE_TIME = 150; // ms
	var TYPING_TIMER_LENGTH = 400; // ms
	var COLORS = [
		'#e21400', '#91580f', '#f8a700', '#f78b00',
		'#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
		'#3b88eb', '#3824aa', '#a700ff', '#d300e7'
	];

	// Initialize varibles
	var $window = $(window),
		$usernameInput = $('.usernameInput'),
		$messages = $('.messages'),
		$inputMessage = $('.inputMessage'),
		$loginPage = $('.login.page'),
		$chatPage = $('.chat');

	// Prompt for setting a username
	var username;
	var connected = false;
	var typing = false;
	var lastTypingTime;
	var $currentInput = $usernameInput.focus();

	var socket = io();

	function addParticipantsMessage (data) {
		var message = '';
		if (data.numUsers === 1) {
			message += "You are alone";
		} else {
			message += "there are " + data.numUsers + " people online";
		}
		logChatInfo(message);
	}

	function setUsername () {
		username = cleanInput($usernameInput.val().trim());

		// If the username is valid
		if (username) {
			$loginPage.fadeOut();
			$chatPage.show();
			$loginPage.off('click');
			$currentInput = $inputMessage.focus();

			socket.emit('add user', username);
		}
	}

	function sendMessage () {
		var message = $inputMessage.val();
		message = cleanInput(message);

		if (message && connected) {
			$inputMessage.val('');
			addChatMessage({
				username: username,
				message: message
			});

			socket.emit('new message', message);
		}
	}

	// Log a message
	function logChatInfo (message, options) {
		var $el = $('<li>').addClass('log').text(message);
		addMessageElement($el, options);
	}

	// Adds the visual chat message to the message list
	function addChatMessage (data, options) {
		// Don't fade the message in if there is an 'X was typing'
		var $typingMessages = getTypingMessages(data);
		options = options || {};
		if ($typingMessages.length !== 0) {
			options.fade = false;
			$typingMessages.remove();
		}

		var $usernameDiv = $('<span class="username"/>')
			.text(data.username)
			.css('background', getUsernameColor(data.username));
		var $messageBodyDiv = $('<span class="messageBody">')
			.text(data.message);

		var typingClass = data.typing ? 'typing' : '';
		var $messageDiv = $('<li class="message"/>')
			.data('username', data.username)
			.addClass(typingClass)
			.append($usernameDiv, $messageBodyDiv);

		addMessageElement($messageDiv, options);
	}

	// Adds the visual chat typing message
	function addChatTyping (data) {
		data.typing = true;
		data.message = 'is typing';
		addChatMessage(data);
	}

	// Removes the visual chat typing message
	function removeChatTyping (data) {
		getTypingMessages(data).fadeOut(function () {
			$(this).remove();
		});
	}

	function addMessageElement (el, options) {
		var $el = $(el);

		// Setup default options
		if (!options) {
			options = {};
		}
		if (typeof options.fade === 'undefined') {
			options.fade = true;
		}
		if (typeof options.prepend === 'undefined') {
			options.prepend = false;
		}

		// Apply options
		if (options.fade) {
			$el.hide().fadeIn(FADE_TIME);
		}
		if (options.prepend) {
			$messages.prepend($el);
		} else {
			$messages.append($el);
		}
		$messages[0].scrollTop = $messages[0].scrollHeight;
	}

	// Prevents input from having injected markup
	function cleanInput (input) {
		return $('<div/>').text(input).text();
	}

	// Updates the typing event
	function updateTyping () {
		if (connected) {
			if (!typing) {
				typing = true;
				socket.emit('typing');
			}
			lastTypingTime = (new Date()).getTime();

			setTimeout(function () {
				var typingTimer = (new Date()).getTime();
				var timeDiff = typingTimer - lastTypingTime;
				if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
					socket.emit('stop typing');
					typing = false;
				}
			}, TYPING_TIMER_LENGTH);
		}
	}

	// Gets the 'X is typing' messages of a user
	function getTypingMessages (data) {
		return $('.typing.message').filter(function (i) {
			return $(this).data('username') === data.username;
		});
	}

	// Gets the color of a username through our hash function
	function getUsernameColor (username) {
		// Compute hash code
		var hash = 7;
		for (var i = 0; i < username.length; i++) {
			 hash = username.charCodeAt(i) + (hash << 5) - hash;
		}
		// Calculate color
		var index = Math.abs(hash % COLORS.length);
		return COLORS[index];
	}

	// Keyboard events

	$window.keydown(function (event) {
		if (!(event.ctrlKey || event.metaKey || event.altKey)) {
			$currentInput.focus();
		}
		// When the client hits ENTER on their keyboard
		if (event.which === 13) {
			if (username) {
				sendMessage();
				socket.emit('stop typing');
				typing = false;
			} else {
				setUsername();
			}
		}
	});

	$inputMessage.on('input', function() {
		updateTyping();
	});

	// Click events

	$loginPage.click(function () {
		$currentInput.focus();
	});

	$inputMessage.click(function () {
		$inputMessage.focus();
	});

	// Socket events

	socket.on('login', function (data) {
		connected = true;
		addParticipantsMessage(data);
	});

	socket.on('new message', function (data) {
		addChatMessage(data);
	});

	socket.on('user joined', function (data) {
		logChatInfo(data.username + ' joined the room');
		addParticipantsMessage(data);
	});

	socket.on('user left', function (data) {
		logChatInfo(data.username + ' left the room');
		addParticipantsMessage(data);
		removeChatTyping(data);
	});

	socket.on('typing', function (data) {
		addChatTyping(data);
	});

	socket.on('stop typing', function (data) {
		removeChatTyping(data);
	});
});