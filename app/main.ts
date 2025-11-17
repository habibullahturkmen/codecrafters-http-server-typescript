import * as net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// TODO: Uncomment the code below to pass the first stage
const server: net.Server = net.createServer((socket) => {
  socket.on("data", (chunk) => {
    const request = chunk.toString();
    const [requestLine] = request.split("\r\n");
    const [method, path] = requestLine.split(" ");
    console.log(path);
    if (path === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
      return;
    }
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
  });
  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
