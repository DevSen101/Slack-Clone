const express = require("express");
const app = express();
const socketio = require("socket.io");

let namespaces = require("./data/namespaces");
// console.log(namespaces);
app.use(express.static(__dirname + "/public"));
const expressServer = app.listen(9000);
const io = socketio(expressServer);

// io.on = io.of("/").on;
io.on("connection", (socket) => {
  // console.log(socket.handshake);
  //  build an array to send back with the img and endpoint for each NS //
  let nsData = namespaces.map((ns) => {
    return {
      img: ns.img,
      endpoint: ns.endpoint,
    };
  });
  // console.log(nsData);
  // send the nsData back to the client. We need to use socket , not io , because we want it to
  // go to just client.
  socket.emit("nsList", nsData);
});

//  loop through each namespace and listen for a connection
namespaces.forEach((namespace) => {
  io.of(namespace.endpoint).on("connection", (nsSocket) => {
    const username = nsSocket.handshake.query.username;
    console.log(`${nsSocket.id} has join ${namespace.endpoint}`);
    // a socket has connected to one of our chatgroup namespace.
    // send that ns group info back
    nsSocket.emit("nsRoomLoad", namespace.rooms);
    nsSocket.on("joinRoom", (roomToJoin, numberOfUsersCallback) => {
      // deal with history. once we hae it
      console.log(nsSocket.rooms);
      const roomToLeave = Object.keys(nsSocket.rooms)[1];
      nsSocket.leave(roomToLeave);
      updateUsersInRoom(namespace, roomToLeave);
      nsSocket.join(roomToJoin);
      // io.of("/wiki")
      //   .in(roomToJoin)
      //   .clients((error, clients) => {
      //     console.log(clients.length);
      //     numberOfUsersCallback(clients.length);
      //   });
      const nsRoom = namespace.room.find((room) => {
        return room.roomTitle === roomToJoin;
      });

      nsSocket.emit("historyCatchup", nsRoom.history);
      updateUsersInRoom(namespace, roomToJoin);
    });
    nsSocket.on("newMessageToServer", (msg) => {
      const fullMsg = {
        text: msg.text,
        time: Date.now(),
        username: username,
        avatar: "https://via.placeholder.com/30",
      };
      console.log(fullMsg);
      // send the message to all the sockets hat are in the room that this socket is in
      //he can be find out what rooms.This socket is in
      console.log(nsSocket.rooms);
      // the user will be in the 2ns room in the object list
      // this is because the socket ALWAYS joins its own room to connection
      // get the keys
      const roomTitle = Object.keys(nsSocket.rooms)[1];
      // We need to find the room object for this room
      const nsRoom = namespace.room.find((room) => {
        return room.roomTitle === roomTitle;
      });

      console.log("The room object that we made that matches this room is ...");
      console.log(nsRoom);
      nsRoom.addMessage(fullMsg);
      io.of(namespace.endpoint).to(roomTitle).emit("messageToClients", fullMsg);
    });
  });
});

function updateUsersInRoom(namespace, roomToJoin) {
  // send back the number of users in this room to ALL sockets connected to this room
  io.of(namespace.endpoint)
    .in(roomToJoin)
    .clients((error, clients) => {
      console.log(` There are ${clients.length} users in this room`);
      io.of(namespace.endpoint)
        .in(roomToJoin)
        .emit("updateMembers", clients.length);
    });
}
