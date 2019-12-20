/**
 * Dependencies.
 */
var pkg = require('../package.json');
var JsSIP = require('qiyujssip');
var deepmerge = require('deepmerge');
var debug = JsSIP.debug('QiyuConnect');
var debugUA = JsSIP.debug('QiyuUA');
var debugMethod = JsSIP.debug('QiyuMethod');
var debugSession = JsSIP.debug('QiyuSession');


var config = require('./Config.js');

debug('version %s', pkg.version);

var adaptor = {};
var uaEventHandlers = {}; // 代理事件
// var adaptorEvents = {}; // 代理模块事件注册

//  代理状态
var C = {
    STATUS_SUCCESS: 0, // READY 准备好
    STATUS_INIT: 1, // 正在初始化
    STATUS_RETRY: 6,// CONNECT_NOTREADY 连接初始化未准备好
    STATUS_FAIL: 2, // CONNECT_FAIL 连接初始化失败
    STATUS_MIC_NOT: 3, // 未找到麦克风
    STATUS_MIC_UN: 4,
    STATUS_UNSAFE: 5, //非安全模式，即使用http登陆
    Cause: {
        '0': '',
        '1': '电话功能尚未初始化完成，请刷新或稍后重试!',
        '2': '电话功能初始化失败，请刷新或稍后重试!',
        '3': '未找到可用的麦克风，请检查麦克风设置并刷新页面重试',
        '4': '麦克风被禁用，请检查麦克风设置并刷新页面重试',
        '5': '非安全模式不允许使用音频，请切换成HTTPS方式登录后使用',
        '6': '电话功能尚未初始化完成，正在努力工作中，请刷新或稍后重试!',
    }
};

var sessionC = {
    Direction: {
        1: 'CALLIN',
        2: 'CALLOUT',
        3: 'LISTENER',
        4: 'TRANSFER',
        5: 'FORECAST',
        6: 'CONFERENCE'
    },
    directionType: {
        'CALLIN': 1,
        'CALLOUT': 2,
        'LISTENER': 3,
        'TRANSFER': 4,
        'FORECAST': 5,
        'CONFERENCE': 6
    }
};

var QiyuAdaptor = module.exports = {
    C: {
        sessionType: sessionC.directionType
    },
    isConnected: isConnected,
    isConnectError: isConnectError,
    getConfiguration: getConfiguration,
    getCause: getCause,
    call: call,
    init: init,
    connect: function() {// 重新连接
        if(adaptor.ua) {
            adaptor.ua.start();
        }
    },
    disconnect: function() { // 断开连接
        if(adaptor.ua) {
            adaptor.ua.stop();
        }
    },
    bye: bye,
    accept: accept,
    answer: answer,
    mute: mute,
    unmute: unmute,
    hold: hold,
    unhold: unhold,
    sendDigit: sendDigit,
    on: addEvent

};
Object.defineProperties(QiyuAdaptor, {
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


// =========================
// SIP适配层 初始化 
// ========================= 
// socket是否连接成功：连接并注册成功
function isConnected() {
    return !adaptor.status;
}
// socket连接错误
function isConnectError() {
    return adaptor.status === C.STATUS_FAIL;
}
// 代理初始化连接失败原因
function getCause(){
    return C.Cause[adaptor.status];
}
// 代理设置项查看
function getConfiguration() {
    return adaptor._configration;
}

/**
 * 代理初始化
 * @param {*} options 
 */
function init(options){
     adaptor.status = C.STATUS_INIT;
    try{
        navigator.mediaDevices.getUserMedia({
            audio: true
        })
        .then(function() {
            _loadConfig(options);
            initSIPUA();
        })
        .catch(function(error) {
            debug('getUserMediaError %O', error);

            if (error.name === 'NotAllowedError') {
                adaptor.status = C.STATUS_MIC_UN;
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                adaptor.status = C.STATUS_MIC_NOT;
            } else if (error.name === 'NotSupportedError') {
                adaptor.status = C.STATUS_UNSAFE;
            }
        });
    } catch(e){
         debug('getUserMediaError %O', e);
        // TypeError: Cannot read property 'getUserMedia' of undefined
        if(location.protocol !== 'https:'){
            adaptor.status = C.STATUS_UNSAFE;
        }
    }
}

// 代理配置项格式化
function _loadConfig(options){
    var target = Object.assign({}, config.settings);

    var src = Object.assign({}, config.defaultConfig, options ); 
    adaptor._configration = config.load(target, src);
    return target;
}

// =========================
// SIP UA 初始化 
// ========================= 
var ua = null;
function initSIPUA(){
    try {
        var _configration = adaptor._configration;

       var uaOptions = deepmerge({
            sockets: new JsSIP.WebSocketInterface(_configration.socket.url)
        }, _configration.ua, true);

        ua = new JsSIP.UA(uaOptions);
 
        ua.registrator().setExtraHeaders(_configration.extraHeaders);
        ua.start();

        
        ua.on('connecting', onUAEvent('connecting'));
        ua.on('connected', onUAEvent('connected'));
        ua.on('disconnected', onUAEvent('disconnected'));
        ua.on('registered', onUAEvent('registered'));
        ua.on('unregistered', onUAEvent('unregistered'));
        ua.on('registrationFailed', onUAEvent('registrationFailed'));
        ua.on('newRTCSession', onUAEvent('newRTCSession'));
        // ua.on('connecting', onConnecting);
        // ua.on('connected', onConnected);
        // ua.on('disconnected', onDisconnected);
        // ua.on('registered', onRegistered);
        // ua.on('unregistered', onUnregistered);
        // ua.on('registrationFailed', onRegistrationFailed);
        // ua.on('newRTCSession', onNewRTCSession);

    } catch (error) {
        debug('login error %s', error.message);
    }
}

function onUAEvent(type){
    return function(data) {
        debugUA('[emitUAEvent] type: %s, data: %O', type, data);
        if(uaEventHandlers.hasOwnProperty(type) &&
            Object.prototype.toString.call(uaEventHandlers[type]) === '[object Function]'
            ){
            uaEventHandlers[type].call(adaptor, data);
        }
    };
}

uaEventHandlers = {
    connected: function(data){
        this.connected = true;
        this.reconnect = 0;
        this.callingReconnect = false;
        debugUA('[onConnected] %O',{
            ws: this._configration.socket.url || '',
            data: data
        });
    },
    // 注册成功 ua.on('registered', onRegistered);
    registered: function() {
        this.status = C.STATUS_SUCCESS;
    },
    // 注册注销 ua.on('unregistered', onUnregistered);
    unregistered: function(data){
        this.status = C.STATUS_FAIL;
        debugUA('[onUnregistered] %O', data || {});
    },
    // 注册失败  ua.on('registrationFailed', onRegistrationFailed);
    registrationFailed: function(data){
        this.status =  C.STATUS_FAIL;
        var failedCause = 'ws服务注册失败-重连 连接错误';
        // 连接状态  请求超时pending、响应超时 408、410、420、480  UNAVAILABLE 
        var isConnected = ua.isConnected();

        /* 连接状态 请求超时 */
        var isResponseTimeout = data.cause && data.cause === 'UNAVAILABLE';
        var isRequestTimeout = data.cause && data.cause === 'Request Timeout';
        var isConnectTimeOut = isRequestTimeout || isResponseTimeout;
        // 若是响应超时避免服务器集结压力过大做时间缓冲, 区间为5s
        var isValidRegister = !this.timestampRegister || (Math.abs(Date.now() - this.timestampRegister)/1000 > 5);
        if(isConnected && isConnectTimeOut && isValidRegister ) {
            this.timestampRegister = Date.now();
            failedCause = 'ws服务注册失败-重试';
            ua.register();// 未注册成功过 或 注册成功过isResistered 则关闭 一个周期仅触发一次 ua.registered  ua.registrator.close();
        } else {
            var isConnectError = data.cause && data.cause === 'Connection Error';
            this.uaConnectError = isConnectError;
        }

        debugUA('[onRegistrationFailed] %O', {
            cause: failedCause,
            data: data
        });
    },
    // 连接失败 ua.on('disconnected', onDisconnected);
    disconnected: function(data){
        this.status =  C.STATUS_FAIL;
        var socketConfig = this._configration.socket;
        if(socketConfig.type){
            socketDisconnectedNLB.apply(this, data);
        }
        debugUA('[onDisconnected] %O', {
            data: data || {},
            ua: ua || {},
            socketConfig: socketConfig
        });
    },
    // 获取电话，注册电话事件 ua.on('registrationFailed', onNewRTCSession);
    newRTCSession: function(data){
        debug('[onNewRTCSession] %O', {
            data: data
        });
        if (data.originator === 'local') { return; }

        debugUA('[onNewRTCSession] %O', {
            data: data
        });
        var _session = data.session;
        // Avoid if busy or other incoming
        if (adaptor._session) {
            debug('[terminate] %O', { // debug
                status_code: 486,
                reason_phrase: 'Busy Here',
                session: _session
            });

            _session.terminate({
                status_code: 486,
                reason_phrase: 'Busy Here'
            });
            return;
        }
        
        adaptor._session = _session;

        var  directionType = data.request.hasHeader('Direction-Type') ? Number(data.request.getHeader('Direction-Type')) : sessionC.directionType.CALLIN;
        fireEvent('ringing', {  type: directionType });

        /* if(['CALLOUT', 'LISTENER'].inclueds(sessionC.Direction[directionType])){
            adaptor.accept();
        } */

        _session.on('accepted', function() {
                // window.document.getElementById('qiyuPhone') idSelector
            var nodePhone = window.document && (nodePhone = window.document.getElementById(adaptor._configration.media_selectorId));
            if (nodePhone) {
                // Display remote stream
                nodePhone.srcObject = _session.connection.getRemoteStreams()[0];
            }
            // stats.startStats(session.connection);
        });
        _session.on('ended', function() {
            debug('jssip:ended');

            // stats.stopStats();
            adaptor._session = null;
        });
        _session.on('failed', function() {
            debug('jssip:failed');
            // stats.stopStats();
            adaptor._session = null;
        });

    }
};

function socketDisconnectedNLB(data){
    try {
        // ①若连接成功过之后未连接成功  ②_uaConnectError 避免重复执行 ③ 避免服务器高并发请求集结做缓冲
        var isValidConnect = !this._timestampConnect || (Math.abs(Date.now() - this._timestampConnect)/1000 > 1);
        if(data.error && this._uaConnectError && this._connected && isValidConnect) {
            this._uaConnectError = 0;
            this._timestampConnect = Date.now();
            this.ua.start();
        }
    } catch (e) {
        console.log('disconnect error');
    }
}


// ========================= 
// SIP Session Methods
// =========================
var _sessionCommonOptions = null;
function getSessionOptions(options, overwrite){
    if(!_sessionCommonOptions) {
        _sessionCommonOptions = {   
            extraHeaders: adaptor._configration.extraHeaders.slice() 
        };
    }
    return deepmerge(options || {}, _sessionCommonOptions, overwrite || false);
}

// var uaMethodHandlers = {};
/**
 * @param  {String} 呼叫目标
 * @param  {Object} options 可选的扩展对象
 */
function call(target, options) {
    return adaptor.ua.call(target, deepmerge(options || {}, {
        extraHeaders: adaptor._configration.extraHeaders.slice()
    }));
}
function accept(options) {
    var hasAccept = false;//是否接起过
    var _configration = adaptor._configration;
    var answerOptions = _configration.session; //media.pcConfig;

    // 重试机制白名单：3次重试
    // var someCode = ['7','ipcc1213','gamesbluebc','wmccs','yimutian','7daichina','5050sgmw','siji','bluebc'];//这里的企业，在接起时获取媒体设备，如果没有返回，增加重试机制
    var retryCount = 0;//重试次数
    var retryTimer = null; //重试定时器

    var  retryCorpWhiteList = _configration.meida_whitelist || []; //_configration.meida.whitelist;
    var  TheCorp = _configration.corpCode;

    debugMethod('[accept] corpCode:%s options: %O', TheCorp, options);
    if (retryCorpWhiteList.includes(TheCorp)) {
        retryGetUserMedia();
    } else {// 非白名单直接接听处理 // 非someCode里定义的企业保持原有的逻辑
        if(adaptor.session){
            answer(adaptor.session, answerOptions);
        }
    }

    function retryGetUserMedia() {
        retryCount++;
        retryTimer = null;
        //重试次数小于3次时，起一个定时器，如果navigator.mediaDevices.getUserMedia没有返回，定时器触发，重试。
        if (retryCount < 3){ 
            retryTimer = setTimeout(retryGetUserMedia, 200);
        }

        try{
            navigator.mediaDevices.getUserMedia({audio: true, video: false}).then(function(stream) {
                clearTimeout(retryTimer);
                debugMethod('[accept] getUserMedia success. retryCount:%d hasAccept:%d', retryCount, Number(hasAccept));

                if(!hasAccept){//防止多次调用：如果navigator.mediaDevices.getUserMedia返回就是很慢，三次重试过了，然后同时返回成功，此时防止接起多次
                    answerOptions.mediaStream = stream;
                    answer(adaptor.session, answerOptions);
                    hasAccept = true;
                }

            }).catch(function(error) {
                debugMethod('[accept] retryCount:%d getUserMedia failed %O', retryCount, error);
            });
        }catch(e){
            console.log(e);
        }
    }
}
/**
 * @param  {Obejct} 可选参数用于以后扩展
 */
function answer(options) {
    if(adaptor.session) {
        adaptor.session.answer(getSessionOptions(options));
        debugSession('[answer] %O',{
            session: adaptor.session,
            options: options
        });
    }
}

function bye(options) {
    if(adaptor.session) {
        adaptor.session.terminate(getSessionOptions(options));
        debugSession('[bye] %O',{
            session: adaptor.session,
            options: options
        });
    }
}


/**
 * [hold description]
 * @param  {[type]} session [description]
 * @param  {[type]} options [description]
 *     useUpdate  Boolean Send UPDATE instead of re-INVITE
 * @param  {[type]} done [description] 成功后的回调
 * @return {[type]}         [description]
 */
function hold(options, done) {
    if(adaptor.session) {
        adaptor.session.hold(getSessionOptions(options), done);
        debugSession('[hold] %O',{
            session: adaptor.session,
            options: options
        });
    }
}
/**
 * [unhold description]
 * @param  {[type]} session [description]
 * @param  {[type]} options [description]
 *     useUpdate  Boolean Send UPDATE instead of re-INVITE
 * @param  {[type]} done [description] 成功后的回调
 * @return {[type]}         [description]
 */
function unhold(options, done) {
    if(adaptor.session) {
        adaptor.session.unhold(getSessionOptions(options), done);
        debugSession('[unhold] %O',{
            session: adaptor.session,
            options: options
        });
    }
}



/**
 * Mutes the local audio and/or video.
 * @param  {[type]} session [description]
 * @param  {[type]} options [description]
 *     audio.  Boolean Determines whether local audio must be muted
 *     video.  Boolean Determines whether local video must be muted
 * @return {[type]}         [description]
 */
function mute(options) {
    if(adaptor.session) {
        adaptor.session.mute(options);
        debugSession('[mute] %O',{
            session: adaptor.session,
            options: options
        });
    }
}
/**
 * UnMutes the local audio and/or video.
 * @param  {[type]} session [description]
 * @param  {[type]} options [description]
 *     audio.  Boolean Determines whether local audio must be muted
 *     video.  Boolean Determines whether local video must be muted
 * @return {[type]}         [description]
 */
function unmute(options) {
    if(adaptor.session) {
        adaptor.session.unmute(options);
        debugSession('[unmute] %O',{
            session: adaptor.session,
            options: options
        });
    }
}
/**
 * @param  {Number or String} 符合DTMF标准的   eg.  sendDigit(4) or sendDigit('1234#')
 */
function sendDigit(tone) {
    if(adaptor.session) {
        adaptor.session.sendDTMF(tone);
        debugSession('[sendDigit] %O',{
            session: adaptor.session,
            tone: tone
        });
    }
}






/* Emitter */
// ==========
/**
 * 注册事件到该模块上
 * @param {[String]}   eventType   事件句柄
 * @param {Function} eventHandle  事件处理
 * @param {[this]}   scope    注册模块，默认为当前模块
 */
//  'ringing', //来电事件
//  'call', //pc端唤起拨号
//  'warning',//提示用户重启浏览器  
//  'jitterbuffer' //拨号中上报延迟信息
var EVENTS_CUSTOM = {};
function addEvent(eventType, eventHandle, scope) {
    if (typeof eventType === 'string') {
        EVENTS_CUSTOM[eventType] = function() {
            eventHandle.apply(scope, Array.prototype.slice.call(arguments));
        };
    }
}
/**
 * 触发注册事件
 * @param {[String]}   eventType   事件句柄
 * @param {Object} options  事件处理所需参数 
 */
function fireEvent(eventType, options) {
    if (typeof EVENTS_CUSTOM[eventType] === 'function') {

        debug('fireEvent %s %O', eventType, options);

        EVENTS_CUSTOM[eventType](eventType, options);
    }
}