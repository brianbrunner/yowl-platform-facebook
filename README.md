# yowl-platform-facebook

```
npm install yowl-platform-facebook --save
```

https://developers.facebook.com/docs/messenger-platform/quickstart

```
var facebook = require('yowl-platform-facebook');

bot.platform(facebook({ validationToken: 'validation_token',
                        accessToken: 'access_token',
                        webhook: '/webhook/facebook' }));
```
