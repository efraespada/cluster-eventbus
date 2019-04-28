const rp = require('request-promise');

function RequestBuilder() {

  this.getRequest = function (url, data) {
    return new Promise(function (resolve, reject) {
      let options = {
        uri: url,
        qs: data,
        json: true
      };
      rp(options)
        .then(function (parsedBody) {
          resolve(parsedBody)
        })
        .catch(function (err) {
          reject(err)
        });
    });
  };

  this.postRequest = function (url, data) {
    return new Promise(function (resolve, reject) {
      let options = {
        method: 'POST',
        uri: url,
        body: data,
        json: true
      };
      rp(options)
        .then(function (parsedBody) {
          resolve(parsedBody)
        })
        .catch(function (err) {
          reject(err)
        });
    });
  };

}

module.exports = RequestBuilder;
