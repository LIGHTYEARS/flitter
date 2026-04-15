class S6T {
  constructor(T, R, a) {
    this.url = T, this.headers = R, this.callbacks = a;
  }
  connect() {
    this.ws = new dD.default(this.url, {
      headers: this.headers
    }), this.ws.onopen = this.callbacks.onopen, this.ws.onerror = this.callbacks.onerror, this.ws.onclose = this.callbacks.onclose, this.ws.onmessage = this.callbacks.onmessage;
  }
  send(T) {
    if (this.ws === void 0) throw Error("WebSocket is not connected");
    this.ws.send(T);
  }
  close() {
    if (this.ws === void 0) throw Error("WebSocket is not connected");
    this.ws.close();
  }
}