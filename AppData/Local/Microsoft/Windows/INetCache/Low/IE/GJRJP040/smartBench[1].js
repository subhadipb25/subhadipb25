
if (typeof require !== 'undefined') {
  // XXX: ugly idiom for legacy support

  // TODO: update pathing of legacy files to use version 0.0.2
  var $ = require('../../assets/js/jquery-1.11.2.js');
  var Base64 = require('../../assets/js/base64.js');
}

  var i = 666;
  var version = '0.1.0';
  //only use production bench if hostname is production
  var isProd = (location.host === 'cdn.bitmedianetwork.com');

  var getHostName = function (url) {
      var match = url.match(/:\/\/(.[^/:]+)/i);
      if (match != null && match.length > 1
        && typeof match[1] === 'string' && match[1].length > 0) {
          return match[1];
      }
      return null;
  };

  var createPing = function (event_name, action, i, data) {
    var pingUrl = "https://i-" + i + ".b-0.ad.bench.utorrent.com/";
    var params = {
      eventName: event_name,
      action:  action? action : 'any'
    };
    // console.debug(params.eventName);

    // add event specific event parameter
    for (var attr in data) {
      params[attr] = data[attr];
    }

    // find the right calling url
    var url = document.location.href;
    if (document.referrer) {
      // if there is a referrer we are in a frame
      if (this.getHostName(document.referrer) === this.getHostName(url) && !url.match('utweb')) {
        // This is our own frame, so we are in the player.
        // So use the parent url.
        url = document.referrer;
      }
    }

    var geo = "none";

    // add certain event parameters from the referrer url
    if (url.match(/\?./)) {
        var current_params = url.split('?')[1].split('&');
        for (var x in current_params) {
            var kv = decodeURIComponent(current_params[x]).split("=");
            var clientParams = ['geo', 'uid', 'clientdata', 'browser'];
            if (clientParams.indexOf(kv[0].toString()) > -1) {
              params[kv[0]] = kv[1];
              if (kv[0] === 'geo') {
                // append the geo to the event name, e.g. ap.video.playerloaded.us
                geo = kv[1];
              }
            }
        }
    }

    var bucketNameModified = getCurrentBucketName();

    // Remove '.' from bucket as those conflict with graphite metric paths
    bucketNameModified = bucketNameModified.split('.').join('-');

    // Remove '+' from bucket as those are suppressed before graphite
    bucketNameModified = bucketNameModified.split('+').join('-');

    // set the action field to geo + bucket name, e.g. us.www-bt-co
    params.action += "." + geo + "." + bucketNameModified;

    // also set the bucket in the payload (duplicate, but DataEng request)
    params['bucket'] = bucketNameModified;

    console.debug(params.eventName+" "+params.action);

    // Add in debug parameter
    // Fix base64 dependency?
    var paramsJson = typeof JSON !== "undefined" ? JSON.stringify(params) : "";
    //console.debug(paramsJson);
    var base64_params = Base64.encode(paramsJson);

    //add debug flag to pingUrl if not in prod
    pingUrl += 'e?i=' + i + '&e=' + base64_params;
    pingUrl += this.isProd ? '' : '&debug=1';
    return pingUrl;
  };

  var sendPing = function (event_name, action, other_data, i, cb) {
    //so that we can set i val on Bench once, instead of passing it every time
    i = i || this.i;

    if (!i) {
      throw 'Must set an i-val to send a Bench ping';
    }

    // get the ping url
    var ping_url = this.createPing(event_name, action, i, other_data);

    function jsonp(url, callback) {
      var callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      window[callbackName] = function(data) {
        delete window[callbackName];
        document.head.removeChild(script);
        callback(data);
      };

      var script = document.createElement('script');
      script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
      document.head.appendChild(script);
    }

    jsonp(ping_url, function(data) {
    });
  };

  // Send a plain event: sendEvent('ads_display_render')
  // Send an event with an action value (e.g. depth): sendEvent('ads_display_render', '3')
  var sendEvent = function (event_name, action, other_data, i, cb) {
    this.sendPing(event_name, action, other_data, i, cb);
  };
