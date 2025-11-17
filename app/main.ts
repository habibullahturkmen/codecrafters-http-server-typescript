import * as net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// TODO: Uncomment the code below to pass the first stage
const server: net.Server = net.createServer((socket) => {
  socket.on("data", (chunk: Buffer) => {
    const request = chunk.toString();
    const [requestLine] = request.split("\r\n");
    const [method, path] = requestLine.split(" ");
    if (path === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
      return;
    }
    if (path.startsWith("/echo")) {
      const text: string = path.replace("/echo/", "");
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${text.length}\r\n\r\n${text}`,
      );
      return;
    }
    if (path.startsWith("/user-agent")) {
      const userAgent = request
        .split("\r\n")
        .filter((requestItems) => requestItems.includes("User-Agent: "))[0]
        .replace("User-Agent: ", "");
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}`,
      );
      return;
    }
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
  });
  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
