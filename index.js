var debug = require("debug");
var request = require("request");

var FacebookPlatform = function(options) {
  this.verificationToken = options.verificationToken;
  this.accessToken = options.accessToken;
  this.webhook = options.webhook;
  this.id = "facebook";
  this.capabilities = ["say", "actions"];
};

FacebookPlatform.prototype.attach = function(bot) {
  this.bot = bot;
  this.bot.app.get(this.webhook, this.verifyRequest.bind(this));
  this.bot.app.post(this.webhook, this.messageRequest.bind(this));
};

FacebookPlatform.prototype.verifyRequest = function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === this.verificationToken) {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong validation token');
  }
};

FacebookPlatform.prototype.messageRequest = function (req, res) {
  var messagingEvents = req.body.entry[0].messaging;
  messagingEvents.forEach(this.processEvent.bind(this));
  res.sendStatus(200);
};

FacebookPlatform.prototype.processEvent = function(rawEvent) {

  var context = {
    sessionId: rawEvent.sender.id,
  };
  var event;

  if (rawEvent.message && rawEvent.message.text) {
    event = {
      type: 'message',
      message: rawEvent.message.text,
      page: rawEvent.recipient.id
    };
  } else if (rawEvent.optin) {
    event = {
      type: 'authenticate',
      page: rawEvent.recipient.id
    };
  } else if (rawEvent.postback) {
    event = {
      type: 'action',
      action: rawEvent.postback.payload,
      message: rawEvent.postback.payload,
      page: rawEvent.recipient.id
    };
  }

  if (event) {
    this.bot(this, context, event, function(err, context, event, cb) {
      this.finishProcessEvent(err, context, event, cb);
    }.bind(this));
  }
};

FacebookPlatform.prototype.finishProcessEvent = function(err, context, event, cb) {
  if (err) {
    event.send("Uh oh! Something went wrong!", function(err, context, event, response) {
      cb(err, context, event);
    });
  } else {
    cb(err, context, event);
  }
};

FacebookPlatform.prototype.createMessage = function(event) {
  var messageData;
  if (typeof event === "object") {
    var messageData = {};
    if (event.message) {
      messageData.text = event.message;
    }
    if (event.actions) {
      messageData.template_type = "button";
      var actions = msg.actions.map(function(action) {
        if (typeof action === "string") {
          return {
            type: "postback",
            title: action,
            payload: action
          };
        } else if (typeof action === "object") {
          if (action.url) {
            return {
              type: "web_url",
              title: action.title,
              url: action.url,
              webview_height_ratio: action.webview_height_ratio,
              messenger_extensions: action.messenger_extensions,
              fallback_url: actions.fallback_url,
              webview_share_button: actions.webview_share_button
            }
          } else {
            return {
              type: "postback",
              title: action.title,
              payload: action.payload
            }
          }
        }
      });
    }
  } else {
    messageData = {
      text: event
    };
  }
  return messageData;
};

FacebookPlatform.prototype.send = function(context, event, response, cb) {
  var body = {
    recipient: { id: context.sessionId },
  }

  if (typeof response.typing !== "undefined") {
    body.sender_action = (response.typing) ? "typing_on" : "typing_off";
  }

  var messageData = this.createMessage(response);
  if (Object.keys(messageData).length > 0) {
    body.message = messageData;
  }

  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: this.accessToken },
    method: 'POST',
    json: body
  }, function(err, response, body) {
    debug(err, response, body);
    if (cb) {
      if (err) {
        cb(err, context, event);
      } else if (response.body.error) {
        cb(response.body.error, context, event);
      } else {
        cb(null, context, event);
      }
    }
  });  
};

module.exports = function(options) {
  var platform = new FacebookPlatform(options);
  var initFn = function(bot) {
    platform.attach(bot);
  };
  // Expose characteristics of the platform
  initFn.id = platform.id;
  initFn.capabilities = platform.capabilities;
  initFn.send = platform.send.bind(platform);
  return initFn;
};
