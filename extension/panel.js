/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

console.log("panel: LOAD");

var port = chrome.runtime.connect(null, { name : "panel" });
var tabId = chrome.devtools.inspectedWindow.tabId;

port.onMessage.addListener(function(msg) {
  console.log("panel onMessage", msg);

  switch (msg.action) {
  }
});

port.onDisconnect.addListener(function() {
  console.log("panel onDisconnect");
});

function post(msg) {
  msg.tabId = tabId;
  port.postMessage(msg);
}

post({
  action: "initialized"
});

browser.runtime.sendMessage({
  action: "panel-initialized",
  url: window.location.href,
  tabId: tabId
});
