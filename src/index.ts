export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  DB: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  CHAT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
}

import home from "./home.html";

export class ChatRoom {
  state: DurableObjectState;
  users: WebSocket[];
  messages: string[];
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.users = [];
    this.messages = [];
  }

  handleHome() {
    return new Response(home, {
      headers: {
        "Content-Type": "text/html;chartset=utf-8",
      },
    });
  }
  handleNotFound() {
    return new Response(null, {
      status: 404,
    });
  }
  handleConnect(request: Request) {
    const pairs = new WebSocketPair(); //create pairs of websocket to create connection
    this.handleWebSocket(pairs[1]); //keep second pair on the server
    return new Response(null, { status: 101, webSocket: pairs[0] }); //give first pair to the user
  }
  handleWebSocket(webSocket: WebSocket) {
    webSocket.accept(); //accept connection
    this.users.push(webSocket); //save the websocket to the array to update the list of connected users
    webSocket.send(JSON.stringify({ message: "hello from backend!" })); //send hello message to websocket
    this.messages.forEach((message) => webSocket.send(message)); //send message history to the new user upon connection

    webSocket.addEventListener("message", (event) => {
      //when user sends a message
      this.messages.push(event.data.toString()); //add the message to the message history
      this.users.forEach((user) => user.send(event.data)); //send the message to all connected users
    });
  }

  async fetch(request: Request) {
    const { pathname } = new URL(request.url);
    switch (pathname) {
      case "/":
        return this.handleHome();
      case "/connect":
        return this.handleConnect(request);
      default:
        return this.handleNotFound();
    }
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const id = env.CHAT.idFromName("CHAT"); //set an ID for the chatroom called "CHAT"
    const durableObject = env.CHAT.get(id); //create a new durableObject(chatroom) with ID
    const response = await durableObject.fetch(request); //send request to durableObject
    return response;
  },
};
