/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

console.log("devtools-script: LOAD");

/**
 * Create new DevTools panel.
 */
chrome.devtools.panels.create(
  "Web Sockets",
  "icon-32-color.png",
  "panel.html",
  initialize
);

/**
 * Panel initialization
 *
 * See Panel API Schema:
 * https://dxr.mozilla.org/mozilla-central/source/browser/components/extensions/schemas/devtools_panels.json
 */
function initialize(panel) {
  console.log("My panel initialized", panel);

  panel.onShown.addListener(function (win) {
    console.log("My panel is visible", win);
  });

  panel.onHidden.addListener(function () {
    console.log("My panel is hidden", arguments);
  });
}

/**
 * Communication channel
 */
var port = chrome.runtime.connect(null, { name : "devtools" });
var tabId = chrome.devtools.inspectedWindow.tabId;

function post(msg) {
  msg.tabId = tabId;
  port.postMessage(msg);
}

post({
  action: "devtools-script-message"
});

browser.runtime.sendMessage({
  action: "devtools-script-initialized",
  tabId: tabId,
});

chrome.runtime.onConnect.addListener(port => {
  var name = port.name;

  console.log('devtools-script: new connection: ' + name, port);

  port.postMessage({
    action: "devtools-script new connection callback!"
  });

  port.onMessage.addListener(msg => {
    console.log("devtools-script port.onMessage", msg);
  })
});

port.onDisconnect.addListener(function() {
  console.log("devtools-script onDisconnect");
});

port.onMessage.addListener(function(msg) {
  console.log("devtools-script onMessage ", msg);

  switch (msg.action) {
    // TODO
  }
});
