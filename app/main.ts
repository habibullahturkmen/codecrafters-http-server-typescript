import * as net from "net";

const args = Bun.argv.slice(2);
const directoryIndex = args.indexOf("--directory");
const directoryFlag =
  directoryIndex !== -1 ? args[directoryIndex + 1] : "/temp/";

const server: net.Server = net.createServer((socket: net.Socket) => {
  socket.on("data", async (chunk: Buffer) => {
    const request = chunk.toString();

    const headerEndIndex = request.indexOf("\r\n\r\n");
    if (headerEndIndex === -1) return;

    const headers: string[] = request
      .substring(0, headerEndIndex)
      .split("\r\n");

    const [requestLineHeader] = request.split("\r\n");
    const [method, path, httpVersion] = requestLineHeader.split(" ");
    const host: string | undefined = headers
      .find((h) => h.includes("Host"))
      ?.replace("Host: ", "");
    const userAgent: string | undefined = headers
      .find((h) => h.includes("User-Agent"))
      ?.replace("User-Agent: ", "");
    const accept: string | undefined = headers
      .find((h) => h.includes("Accept"))
      ?.replace("Accept: ", "");
    const contentType: string | undefined = headers
      .find((h) => h.includes("Content-Type"))
      ?.replace("Content-Type: ", "");
    const contentLength: string | undefined = headers
      .find((h) => h.includes("Content-Length"))
      ?.replace("Content-Length: ", "");
    const acceptEncoding: string | undefined = headers
      .find((h) => h.includes("Accept-Encoding"))
      ?.replace("Accept-Encoding: ", "");
    const connection: string | undefined = headers
      .find((h) => h.includes("Connection"))
      ?.replace("Connection: ", "");
    const body: string = request.substring(headerEndIndex + 4, request.length);

    switch (method) {
      case "GET":
        if (path === "/") {
          socket.write(
            `${httpVersion} 200 OK\r\nConnection: ${connection === "close" ? "close" : "keep-alive"}\r\n\r\n`,
          );
          handleSocketClosure(connection, socket);
          return;
        }

        if (path.startsWith("/echo")) {
          const text: string =
            path.includes("/echo/")
              ? path.replace("/echo/", "")
              : path.replace("/echo", "");

          const gzip = acceptEncoding
            ?.split(", ")
            .filter((encoding) => encoding === "gzip")[0];

          if (gzip) {
            const gzipped = Bun.gzipSync(text);
            socket.write(
              `${httpVersion} 200 OK\r\nContent-Encoding: ${gzip}\r\nContent-Type: text/plain\r\nContent-Length: ${gzipped.length}\r\nConnection: ${connection === "close" ? "close" : "keep-alive"}\r\n\r\n`,
            );
            socket.write(gzipped);
            handleSocketClosure(connection, socket);
            return;
          }

          socket.write(
            `${httpVersion} 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${text.length}\r\nConnection: ${connection === "close" ? "close" : "keep-alive"}\r\n\r\n${text}`,
          );
          handleSocketClosure(connection, socket);
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
            .catch(() =>
              socket.write(
                `${httpVersion} 404 Not Found\r\nConnection: ${connection === "close" ? "close" : "keep-alive"}\r\n\r\n`,
              ),
            );

          if (typeof fileContent === "boolean") {
            handleSocketClosure(connection, socket);
            return;
          }

          socket.write(
            `${httpVersion} 200 OK\r\nContent-Type: ${contentType ?? "application/octet-stream"}\r\nContent-Length: ${contentLength ?? fileContent.length}\r\nConnection: ${connection === "close" ? "close" : "keep-alive"}\r\n\r\n${fileContent}`,
          );
          handleSocketClosure(connection, socket);
          return;
        }

        if (path === "/user-agent" || path === "/user-agent/") {
          socket.write(
            `${httpVersion} 200 OK\r\nContent-Type: ${contentType ?? "text/plain"}\r\nContent-Length: ${contentLength ?? userAgent?.length}\r\nConnection: ${connection === "close" ? "close" : "keep-alive"}\r\n\r\n${userAgent}`,
          );
          handleSocketClosure(connection, socket);
          return;
        }
        break;
      case "POST":
        if (path.startsWith("/files")) {
          const fileName: string =
            path === "/files"
              ? path.replace("/files", "")
              : path.replace("/files/", "");

          await Bun.write(`${directoryFlag}${fileName}`, `${body}`);

          const file = Bun.file(`${directoryFlag}${fileName}`);
          const fileContent: string | boolean = await file
            .text()
            .catch(() =>
              socket.write(
                `${httpVersion} 404 Not Found\r\nConnection: ${connection === "close" ? "close" : "keep-alive"}\r\n\r\n`,
              ),
            );

          if (typeof fileContent === "boolean") {
            return;
          }

          socket.write(
            `${httpVersion} 201 Created\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\nConnection: ${connection === "close" ? "close" : "keep-alive"}\r\n\r\n${body}`,
          );
          handleSocketClosure(connection, socket);
          return;
        }
        break;
    }

    socket.write(
      `${httpVersion} 404 Not Found\r\nConnection: ${connection === "close" ? "close" : "keep-alive"}\r\n\r\n`,
    );
    handleSocketClosure(connection, socket);
  });

  socket.on("close", () => {
    socket.end();
  });
});

console.log("Connection Established!");
server.listen(4221, "localhost");

const handleSocketClosure = (
  connectionStatus: string | undefined,
  socket: net.Socket,
) => {
  if (connectionStatus && connectionStatus === "close") socket.end();
};
