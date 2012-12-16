
/**
 * Module dependencies.
 */

var sio = require('socket.io');

/**
 * Socket.io TCP port to bind to. Port 8080 by default.
 */

var port = parseInt(process.argv[2], 10) || 8080;

/**
 * The connection to the socket.io "receiver client".
 */

var receiver;

/**
 * The connection to the socket.io "sender client".
 */

var sender;

/**
 * Setup socket.io server.
 */

console.log('socket.io "relay server" starting on port %d', port);
var io = sio.listen(port);

/**
 * We wait for the socket.io client connection before we can relay any UDP
 * traffic. Simply expose the "socket" variable to the global scope.
 */

io.sockets.on('connection', function (socket) {
  console.log('socket connected...');

  socket.on('disconnect', function () {
    console.log('"disconnect" event');
    if (socket === receiver) {
      receiver = null;
    } else if (socket === sender) {
      sender = null;
    }
  });

  socket.on('mode', function (mode) {
    console.log('%j connected!', mode);
    socket.relayMode = mode;
    switch (mode) {
      case 'sender':
        // the program sending commands to the AR.Drone
        if (sender) {
          // some old sender socket? try to disconnect...
          sender.disconnect();
        }
        sender = socket;
        break;
      case 'receiver':
        // the AR.Drone itself
        if (receiver) {
          // some old receiver socket? try to disconnect...
          receever.disconnect();
        }
        receiver = socket;
        break;
      default:
        // shouldn't happen...
        socket.disconnect();
        break;
    }
  });

  function proxyEvent (event) {
    socket.on(event, function (data) {
      console.log('"%s" event from %j:', event, socket.relayMode, data);
      var target;
      if (socket === sender) {
        target = receiver;
      } else if (socket === receiver) {
        target = sender;
      } else {
        // shouldn't happen...
        socket.disconnect();
        return;
      }
      if (!target) {
        // "receiver" or "sender" must not be connected yet...
        // drop data on floor...
        console.log('dropping data on floor - target not connected');
        return;
      }
      target.emit(event, data);
    });
  }

  [ 'udp',
    'tcp connect',
    'tcp data',
    'tcp end',
    'tcp close'
  ].forEach(proxyEvent);
});
