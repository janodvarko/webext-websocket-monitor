/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

console.log("background-script: LOAD");

/**
 * Register message listener
 */
browser.runtime.onMessage.addListener(msg => {
  console.log("background-script runtime.onMessage", msg);

  const {action} = msg;
  switch (action) {
    case "panel-initialized":
    onPanelInitialized(msg);
    break;
  }
});

chrome.runtime.onConnect.addListener(port => {
  var name = port.name;

  console.log('background-script: new connection: ' + name, port);
});

/**
 * WebSockets panel initialized (opened for the first time).
 */
function onPanelInitialized(msg) {
  var websocket = browser.websocket;

  websocket.onFrameSent.addListener(msg => {
    console.log("background-script.js onFrameSent: ", msg);
  });

  websocket.connect(msg.tabId).then(
    message => console.log(`WS service connected: "${message}"`)
  );
}
