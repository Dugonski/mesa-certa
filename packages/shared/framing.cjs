// TCP is a byte stream: messages may arrive fragmented or grouped.
const { StringDecoder } = require("node:string_decoder");
const MAX_FRAME_BYTES = 4 * 1024 * 1024;
function createDecoder(onMessage, onError) {
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  let failed = false;
  return (chunk) => {
    if (failed) return;
    buffer += decoder.write(chunk);
    try {
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (Buffer.byteLength(line) > MAX_FRAME_BYTES)
          throw new Error("Mensagem muito grande.");
        if (line) onMessage(JSON.parse(line));
      }
      if (Buffer.byteLength(buffer) > MAX_FRAME_BYTES)
        throw new Error("Mensagem muito grande.");
    } catch (error) {
      failed = true;
      onError(error);
    }
  };
}
function encode(message) {
  const line = JSON.stringify(message);
  if (Buffer.byteLength(line) > MAX_FRAME_BYTES)
    throw new Error("Mensagem muito grande.");
  return `${line}\n`;
}
module.exports = { createDecoder, encode, MAX_FRAME_BYTES };
