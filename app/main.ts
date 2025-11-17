import * as net from "net";

const args = Bun.argv.slice(2);
const directoryIndex = args.indexOf("--directory");
const directoryFlag =
  directoryIndex !== -1 ? args[directoryIndex + 1] : "/temp/";

const server: net.Server = net.createServer((socket) => {
  socket.on("data", async (chunk: Buffer) => {
    const request = chunk.toString();
    const [requestLine] = request.split("\r\n");
    const [method, path] = requestLine.split(" ");

    if (path === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
      return;
    }

    if (path.startsWith("/echo")) {
      const text: string =
        path === "/echo"
          ? path.replace("/echo", "")
          : path.replace("/echo/", "");
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${text.length}\r\n\r\n${text}`,
      );
      return;
    }

    if (path.startsWith("/files")) {
      const fileName: string =
        path === "/files"
          ? path.replace("/files", "")
          : path.replace("/files/", "");

      const file = Bun.file(`${directoryFlag}${fileName}`);
      const fileContent: string | boolean = await file
        .text()
        .catch(() => socket.write("HTTP/1.1 404 Not Found\r\n\r\n"));

      if (typeof fileContent === "boolean") {
        return;
      }

      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${(fileContent as string).length}\r\n\r\n${fileContent}`,
      );
      return;
    }

    if (path === "/user-agent" || path === "/user-agent/") {
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

console.log("Connection Established!");
server.listen(4221, "localhost");
