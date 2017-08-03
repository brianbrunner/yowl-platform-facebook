# yowl-platform-facebook

Connect yowl to facebook messenger

## Install

```
npm install yowl-platform-facebook --save
```

## Usage

First, get setup with an app on the messenger platform

https://developers.facebook.com/docs/messenger-platform/quickstart

Next, add the facebook platform to your bot.

```
var facebook = require('yowl-platform-facebook');

bot.platform(facebook({ verificationToken: 'verification_token',
                        accessToken: 'access_token',
                        webhook: '/webhook/facebook' }));
```
