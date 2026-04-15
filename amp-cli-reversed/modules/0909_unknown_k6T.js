class k6T {
  constructor(T, R) {
    this.conn = T, this.apiClient = R;
  }
  tLiveClientContent(T, R) {
    if (R.turns !== null && R.turns !== void 0) {
      let a = [];
      try {
        if (a = ui(R.turns), !T.isVertexAI()) a = a.map(e => hU(e));
      } catch (e) {
        throw Error(`Failed to parse client content "turns", type: '${typeof R.turns}'`);
      }
      return {
        clientContent: {
          turns: a,
          turnComplete: R.turnComplete
        }
      };
    }
    return {
      clientContent: {
        turnComplete: R.turnComplete
      }
    };
  }
  tLiveClienttToolResponse(T, R) {
    let a = [];
    if (R.functionResponses == null) throw Error("functionResponses is required.");
    if (!Array.isArray(R.functionResponses)) a = [R.functionResponses];else a = R.functionResponses;
    if (a.length === 0) throw Error("functionResponses is required.");
    for (let e of a) {
      if (typeof e !== "object" || e === null || !("name" in e) || !("response" in e)) throw Error(`Could not parse function response, type '${typeof e}'.`);
      if (!T.isVertexAI() && !("id" in e)) throw Error(iER);
    }
    return {
      toolResponse: {
        functionResponses: a
      }
    };
  }
  sendClientContent(T) {
    T = Object.assign(Object.assign({}, N6T), T);
    let R = this.tLiveClientContent(this.apiClient, T);
    this.conn.send(JSON.stringify(R));
  }
  sendRealtimeInput(T) {
    let R = {};
    if (this.apiClient.isVertexAI()) R = {
      realtimeInput: bjR(T)
    };else R = {
      realtimeInput: _jR(T)
    };
    this.conn.send(JSON.stringify(R));
  }
  sendToolResponse(T) {
    if (T.functionResponses == null) throw Error("Tool response parameters are required.");
    let R = this.tLiveClienttToolResponse(this.apiClient, T);
    this.conn.send(JSON.stringify(R));
  }
  close() {
    this.conn.close();
  }
}