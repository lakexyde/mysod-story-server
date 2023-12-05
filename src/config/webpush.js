const webpush = require('web-push');
const config = require('.');

webpush.setVapidDetails(
  'mailto:information@gloryrealmsministries.org',
  config.webPushPublicKey,
  config.webPushPrivateKey
);

module.exports = webpush;