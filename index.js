var debug = require("debug");
var request = require("request");

var FacebookPlatform = function(options) {
  this.validationToken = options.validationToken;
  this.accessToken = options.accessToken;
  this.webhook = options.webhook;
  this.name = "facebook";
  this.capabilities = ["say", "actions"];
};

FacebookPlatform.prototype.attach = function(bot) {
  this.bot = bot;
  this.bot.app.get(this.webhook, this.verifyRequest.bind(this));
  this.bot.app.post(this.webhook, this.messageRequest.bind(this));
};

FacebookPlatform.prototype.verifyRequest = function (req, res) {
  if (req.query['hub.verify_token'] === this.validationToken) {
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
    event.send(context, event, "Uh oh! Something went wrong!", function(err, context, event, response) {
      cb(err, context, event);
    });
  } else {
    cb(err, context, event);
  }
};

FacebookPlatform.prototype.createMessage = function(event) {
  var messageData;
  if (typeof event !== "string") {
    messageData = {
      text: event.message
    };
    if (event.actions) {
      messageData.template_type = "button";
      messageData.actions = msg.actions.map(function(action) {
        if (typeof action === "string") {
          return {
            type: "postback",
            title: action,
            payload: action
          };
        } else {
          // Handle other types like URLs and shit
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
  var messageData = this.createMessage(response);
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: this.accessToken },
    method: 'POST',
    json: {
      recipient: { id: context.sessionId },
      message: messageData,
    }
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
  return function(bot) {
    platform.attach(bot);
  };
};
