/**
 * Dependencies.
 */

var pkg = require('../package.json');
var JsSIP = require('qiyujssip');
var debug = JsSIP.debug('QiyuConnect');
var deepmerge = require('deepmerge');


debug('version %s', pkg.version);


var QiyuConnect = module.exports = {
    Utils: JsSIP.Utils,
    login: login,
    call: call,
    answer: answer,
    bye: bye,
    hold: hold,
    unhold: unhold,
    mute: mute,
    unmute: unmute,
    sendDigit: sendDigit,
    debug: JsSIP.debug,
    DebugWebRTC: require('debugwebrtc')
};

Object.defineProperties(QiyuConnect, {
    name: {
        get: function() {
            return pkg.title;
        }
    },
    version: {
        get: function() {
            return pkg.version;
        }
    }
});


/**
 * @param {Options}
 *   @param url [String] eg. "ws://59.111.96.125:5066"
 *   @param ua [Object] 
 *      @param  uri [String] eg. "sip:1002@59.111.96.125"
 *      @optinal param  display_name 
 *      @optinal param  password
 *      @optional param contact_uri eg. "sip:1002@59.111.96.125"
 *   @optinal param callback [Function] 回掉函数 arguments[0]:type 事件类型  
 *   @optinal param extraHeaders: Append custom headers to every REGISTER / un-REGISTER request. They can be overriden at any time.
 */

function login(options) {

    /**
     * 事件通知回掉函数
     * @param  {[type]} type [description]
     * @return {[type]}      [description]
     */
    function on(type) {
        return function(data) {
            if (JsSIP.Utils.isFunction(options.callback)) {
                debug('%s:%O', type, data);
                options.callback(type, data);
            } else {
                debug('no callback function!');
            }
        };
    }

    try {

        var ua = this.ua = new JsSIP.UA(deepmerge({
            sockets: new JsSIP.WebSocketInterface(options.url)
        }, options.ua, true));

        ua.registrator().setExtraHeaders(options.extraHeaders);

        ua.on('connecting', on('connecting'));
        ua.on('connected', on('connected'));
        ua.on('disconnected', on('disconnected'));
        ua.on('registered', on('registered'));
        ua.on('unregistered', on('unregistered'));
        ua.on('registrationFailed', on('registrationFailed'));
        ua.on('newRTCSession', on('newRTCSession'));

    } catch (error) {
        debug('login error %s', error.message);
    }
}

/**
 * @param  {String} 呼叫目标
 * @param  {Object} options 可选的扩展对象
 */
function call(target, options) {
    return this.ua.call(target, deepmerge(options || {}, {
        extraHeaders: this.ua.registrator().extraHeaders.slice()
    }));
}
/**
 * @param  {Obejct} 可选参数用于以后扩展
 */
function answer(session, options) {
    session.answer(deepmerge(options || {}, {
        extraHeaders: this.ua.registrator().extraHeaders.slice()
    }));
}

function bye(session, options) {
    session.terminate(deepmerge(options || {}, {
        extraHeaders: this.ua.registrator().extraHeaders.slice()
    }));
}
/**
 * [hold description]
 * @param  {[type]} session [description]
 * @param  {[type]} options [description]
 *     useUpdate  Boolean Send UPDATE instead of re-INVITE
 * @param  {[type]} done [description] 成功后的回调
 * @return {[type]}         [description]
 */
function hold(session, options, done) {
    session.hold(deepmerge(options || {}, {
        extraHeaders: this.ua.registrator().extraHeaders.slice()
    }), done);
}
/**
 * [unhold description]
 * @param  {[type]} session [description]
 * @param  {[type]} options [description]
 *     useUpdate  Boolean Send UPDATE instead of re-INVITE
 * @param  {[type]} done [description] 成功后的回调
 * @return {[type]}         [description]
 */
function unhold(session, options, done) {
    session.unhold(deepmerge(options || {}, {
        extraHeaders: this.ua.registrator().extraHeaders.slice()
    }), done);
}



/**
 * Mutes the local audio and/or video.
 * @param  {[type]} session [description]
 * @param  {[type]} options [description]
 *     audio.  Boolean Determines whether local audio must be muted
 *     video.  Boolean Determines whether local video must be muted
 * @return {[type]}         [description]
 */
function mute(session, options) {
    session.mute(options);
}
/**
 * UnMutes the local audio and/or video.
 * @param  {[type]} session [description]
 * @param  {[type]} options [description]
 *     audio.  Boolean Determines whether local audio must be muted
 *     video.  Boolean Determines whether local video must be muted
 * @return {[type]}         [description]
 */
function unmute(session, options) {
    session.unmute(options);
}
/**
 * @param  {Number or String} 符合DTMF标准的   eg.  sendDigit(4) or sendDigit("1234#")
 */
function sendDigit(session, tone) {
    session.sendDTMF(tone);
}