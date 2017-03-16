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
 * Implementation of experimental API allowing intercepting
 * WebSocket communication happening in specified browser tab.
 *
 * Following methods are supported:
 *   connect() Connecting to WebSocket event service.
 *   disconnect() Disconnecting from WebSocket even service.
 *   onEvent() Callback executed whenever there is a WS event.
 *
 * Example:
 *   var websocket = browser.websocket;
 *
 *   websocket.onEvent.addListener((eventName, data) => {
 *     console.log("WS event: " + eventName, data);
 *   });
 *
 *   websocket.connect(msg.tabId).then(() => {
 *     console.log("connected");
 *   });
 */
class API extends ExtensionAPI {
  getAPI(context) {
    const WSConnections = new Map();
    let wsEvents = new EventEmitter();

    return {
      websocket: {
        async connect(tabId) {
          let conn = new WSConnection(tabId, context, wsEvents);

          WSConnections.set(tabId, conn);
          conn.once("disconnected", () => {
            RDPConnections.delete(tabId);
          });

          // Keep this method asynchronous it might be useful
          // in the future (when remote debugging is supported).
          return Promise.resolve();
        },

        async disconnect(tabId) {
          return Promise.resolve();
        },

        // WebSocket Events
        onEvent: new SingletonEventManager(context, "websocket.onEvent", fire => {
          let listener = (eventName, data) => {
            fire.async(eventName, data);
          };

          wsEvents.on("event", listener);
          return () => {
            wsEvents.off("event", listener);
          };
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
      Cu.reportError("API.removeFrameListener; ERROR " + err, err);
    }
  }
}

/**
 * This object represent a connection to the WS backend
 * associated with specific browser tab.
 */
class WSConnection extends EventEmitter {
  constructor(tabId, context, events) {
    super();

    this.tabId = tabId;
    this.context = context;
    this.listener = new WebSocketEventListener(events);

    // It is used to register an object to be automatically "closed"
    // when the context is destroyed (the "close" method of the passed
    // object will be called once the context is destroyed)
    this.context.callOnClose(this);

    this.addFrameListener();
  }

  close() {
    this.removeFrameListener();
  }

  disconnected() {
    // TODO:
  }

  // nsIWebSocketEventService

  addFrameListener() {
    var innerId = getInnerId(this.tabId);
    webSocketEventService.addListener(innerId, this.listener);
  }

  removeFrameListener() {
    var innerId = getInnerId(this.tabId);
    try {
      webSocketEventService.removeListener(innerId, this.listener);
    } catch (err) {
      Cu.reportError("WSConnection.removeFrameListener; ERROR " + err, err);
    }
  }
}

/**
 * Implementation of a listener for nsIWebSocketEventService.
 * It forwards all WS events to passed 'events' target.
 */
function WebSocketEventListener(events) {
  this.events = events;
}

WebSocketEventListener.prototype = {
  // nsIWebSocketEventService

  QueryInterface:
    XPCOMUtils.generateQI([Ci.nsIWebSocketEventService]),

  webSocketCreated: function(webSocketSerialID, uri, protocols) {
    this.emit("webSocketCreated", {
      webSocketSerialID: webSocketSerialID,
      uri: uri,
      protocols: protocols
    });
  },

  webSocketOpened: function(webSocketSerialID, effectiveURI, protocols, extensions) {
    this.emit("webSocketOpened", {
      webSocketSerialID: webSocketSerialID,
      effectiveURI: effectiveURI,
      protocols: protocols,
      extensions: extensions
    });
  },

  webSocketClosed: function(webSocketSerialID, wasClean, code, reason) {
    this.emit("webSocketClosed", {
      webSocketSerialID: webSocketSerialID,
      wasClean: wasClean,
      code: code,
      reason: reason
    });
  },

  webSocketMessageAvailable: function(webSocketSerialID, data, messageType) {
    this.emit("webSocketMessageAvailable", {
      webSocketSerialID: webSocketSerialID,
      data: data,
      messageType: messageType
    });
  },

  frameReceived: function(webSocketSerialID, frame) {
    this.emit("frameReceived", {
      webSocketSerialID: webSocketSerialID,
      data: frame
    });
  },

  frameSent: function(webSocketSerialID, frame) {
    this.emit("frameSent", {
      webSocketSerialID: webSocketSerialID,
      data: frame
    });
  },

  emit: function(eventName, data) {
    this.events.emit("event", eventName, data);
  }
}

// Helpers

function getInnerId(tabId) {
  let tab = tabTracker.getTab(tabId);

  // FIXME: accessing '_contentWindow' is unsafe/forbidden
  // CPOW usage (see also browser console warning message)
  let win = tab.linkedBrowser._contentWindow;
  return win.QueryInterface(Ci.nsIInterfaceRequestor).
    getInterface(Ci.nsIDOMWindowUtils).currentInnerWindowID;
}
