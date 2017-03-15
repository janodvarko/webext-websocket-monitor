/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {utils: Cu, classes: Cc, interfaces: Ci} = Components;
const {ExtensionUtils} = Cu.import("resource://gre/modules/ExtensionUtils.jsm", {});
const {EventEmitter} = Cu.import("resource://devtools/shared/event-emitter.js", {});
const {Management} = Cu.import("resource://gre/modules/Extension.jsm", {});
const {ConsoleAPI} = Cu.import("resource://gre/modules/Console.jsm", {});
const {XPCOMUtils} = Cu.import("resource://gre/modules/XPCOMUtils.jsm", {});

const {tabTracker} = Management.global;

// Get WebSocket event service (to intercept WS communication)
const webSocketEventService = Cc["@mozilla.org/websocketevent/service;1"].
  getService(Ci.nsIWebSocketEventService);

// The console object isn't available in this scope for now.
const console = new ConsoleAPI({
  prefix: "webext-experiment-myExperimentName",
});

const {
  SingletonEventManager,
  SpreadArgs,
} = ExtensionUtils;

/**
 * TODO
 */
class API extends ExtensionAPI {
  getAPI(context) {
    const WSConnections = new Map();
    let nextWSConnectionId = 1;
    let wsEvents = new EventEmitter();

    return {
      websocket: {
        async connect(tabId) {
          let conn = new WSConnection(tabId, context, wsEvents);

          WSConnections.set(tabId, conn);
          conn.once("disconnected", () => {
            RDPConnections.delete(tabId);
          });

          //this.onFrameSent();

          return Promise.resolve().then(() => {
            // rdpEvents.off("disconnect", listener);
            return "web sockets API service";
          });
        },

        // API Events
        onFrameSent: new SingletonEventManager(context, "websocket.onFrameSent", fire => {
          //wsEvents.on("onFrameSent", listener);
          fire.async(42);
        }).api(),
      }
    };
  }

  // nsIWebSocketEventService

  addFrameListener(tabId) {
    var innerId = getInnerId(this.parent.window);
    webSocketEventService.addListener(innerId, this);
  }

  removeFrameListener(tabId) {
    var innerId = getInnerId(this.parent.window);
    try {
      webSocketEventService.removeListener(innerId, this);
    } catch (err) {
      Cu.reportError("WsmActor.removeFrameListener; ERROR " + err, err);
    }
  }
}

/**
 * TODO
 */
class WSConnection extends EventEmitter {
  constructor(tabId, context, wsEvents) {
    super();

    this.tabId = tabId;
    this.context = context;
    this.wsEvents = wsEvents;

    // It is used to register an object to be automatically "closed"
    // when the context is destroyed (the "close" method of the passed
    // object will be called once the context is destroyed)
    this.context.callOnClose(this);

    this.addFrameListener();
  }

  close() {
    this.removeFrameListener();
  }

  // nsIWebSocketEventService

  addFrameListener() {
    var innerId = getInnerId(this.tabId);
    webSocketEventService.addListener(innerId, WebSocketEventListener);
  }

  removeFrameListener() {
    var innerId = getInnerId(this.tabId);
    try {
      webSocketEventService.removeListener(innerId, WebSocketEventListener);
    } catch (err) {
      Cu.reportError("WSConnection.removeFrameListener; ERROR " + err, err);
    }
  }
}

/**
 *
 */
var WebSocketEventListener = {

  // nsIWebSocketEventService

  QueryInterface:
    XPCOMUtils.generateQI([Ci.nsIWebSocketEventService]),

  webSocketCreated: function(webSocketSerialID, uri, protocols) {
    this.emit(this, "webSocketCreated", {
      webSocketSerialID: webSocketSerialID,
      uri: uri,
      protocols: protocols
    });
  },

  webSocketOpened: function(webSocketSerialID, effectiveURI, protocols, extensions) {
    this.emit(this, "webSocketOpened", {
      webSocketSerialID: webSocketSerialID,
      effectiveURI: effectiveURI,
      protocols: protocols,
      extensions: extensions
    });
  },

  webSocketClosed: function(webSocketSerialID, wasClean, code, reason) {
    this.emit(this, "webSocketClosed", {
      webSocketSerialID: webSocketSerialID,
      wasClean: wasClean,
      code: code,
      reason: reason
    });
  },

  webSocketMessageAvailable: function(webSocketSerialID, data, messageType) {
    this.emit(this, "webSocketMessageAvailable", {
      webSocketSerialID: webSocketSerialID,
      data: data,
      messageType: messageType
    });
  },

  frameReceived: function(webSocketSerialID, frame) {
    console.log("frameReceived", frame);

    this.emit(this, "frameReceived", {
      webSocketSerialID: webSocketSerialID,
      data: frame
    });
  },

  frameSent: function(webSocketSerialID, frame) {
    console.log("frameSent", frame);

    this.emit(this, "frameSent", {
      webSocketSerialID: webSocketSerialID,
      data: frame
    });
  },

  emit: function() {

  }
}

// Helpers

function getInnerId(tabId) {
  let tab = tabTracker.getTab(tabId);
  let win = tab.linkedBrowser._contentWindow;
  return win.QueryInterface(Ci.nsIInterfaceRequestor).
    getInterface(Ci.nsIDOMWindowUtils).currentInnerWindowID;
}
