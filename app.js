// BASE SERVER SETUP --------------------------------
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var socketio = require('socket.io');
var port = process.env.PORT || 3000;

server.listen(port, function () {
	console.log('Server listening at port %d', port);
});

var io = socketio.listen(server);
app.use(express.static(__dirname + '/public'));

// DATA STORAGE -------------------------------------
var usernames = {};
var numUsers = 0;

// SOCKET USAGE -------------------------------------
io.on('connection', function (socket) {
	var userIsOnline = false;
	socket.on('new message', function (msg) {
		socket.broadcast.emit('new message', {
			username: socket.username,
			message: msg
		});
	});

	socket.on('add user', function (username) {
		socket.username = username;
		usernames[username] = username;
		++numUsers;
		userIsOnline = true;
		socket.emit('login', {
			numUsers: numUsers
		});
		socket.broadcast.emit('user joined', {
			username: socket.username,
			numUsers: numUsers
		});
	});

	socket.on('typing', function () {
		socket.broadcast.emit('typing', {
			username: socket.username
		});
	});

	socket.on('stop typing', function () {
		socket.broadcast.emit('stop typing', {
			username: socket.username
		});
	});

	socket.on('disconnect', function () {
		if (userIsOnline) {
			delete usernames[socket.username];
			--numUsers;

			socket.broadcast.emit('user left', {
				username: socket.username,
				numUsers: numUsers
			});
		}
	});
});