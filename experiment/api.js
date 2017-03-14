

class API extends ExtensionAPI {
  getAPI(context) {
    return {
      websocket: {
        async addListener(innerId, listener) {
          listener.frameSent();
          return "Hello, world! " + innerId + " " + listener.username;
        }
      }
    };
  }
}
