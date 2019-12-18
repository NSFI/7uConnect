/**
 * Dependencies.
 */

var pkg = require('../package.json');
var JsSIP = require('qiyujssip');
var debug = JsSIP.debug('QiyuConnect');
var deepmerge = require('deepmerge');


// debug('version %s', pkg.version);
debug('version %s', '2.0.1');


// session.call();

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

var log = function _log (type, options=undefined){
    let args = Array.prototype.slice.call(_log.arguments);
    console && (console.log).apply(this, args);
};

const C = {
  // Adaptor Status
  STATUS_SUCCESS: 0, // READY 准备好
  STATUS_INIT: 1, // 正在初始化
  STATUS_ERROR: 6, // 连接初始化未准备好  信息有错 CONNECT_NOTREADY
  STATUS_FAIL: 2, // 连接初始化失败 CONNECT_FAIL 
  STATUS_MIC_NOT: 3,// 未找到麦克风
  STATUS_MIC_UN: 4,
  STATUS_UNSAFE: 5, // 非安全模式，即使用http登陆；需https 
  causes: {
    '0': '',
    '1': '电话功能尚未初始化完成，请刷新或稍后重试!',
    '2': '电话功能初始化失败，请刷新或稍后重试!',
    '3': '未找到可用的麦克风，请检查麦克风设置并刷新页面重试',
    '4': '麦克风被禁用，请检查麦克风设置并刷新页面重试',
    '5': '非安全模式不允许使用音频，请切换成HTTPS方式登录后使用',
    '6': '电话功能尚未初始化完成，正在努力工作中，请刷新或稍后重试!',
  }
};


var  SIPUA = {
    // { ua , socket, extraHeaders, eventHandlers, methodHandlers }
    /**
     * 
     * @param {*} options 
     * @property eventHandlers { eventType: eventHandler }
     * @property methodHandlers { methodType: methodHandler }
     */
    init: function(options, adaptor){
        try {

            var ua = this.ua = new JsSIP.UA(deepmerge({
                sockets: new JsSIP.WebSocketInterface(options.socket)
            }, options.ua, true));
            this.adaptor = adaptor;
            // this._configration = Object.assign({}, options); //缓存extraHeaders信息，其它接口使用
            ua.registrator().setExtraHeaders(options.extraHeaders);
            ua.start();

            /* ua.on('connecting', on('connecting'));
            ua.on('connected', on('connected'));
            ua.on('disconnected', on('disconnected'));
            ua.on('registered', on('registered'));
            ua.on('unregistered', on('unregistered'));
            ua.on('registrationFailed', on('registrationFailed'));
            ua.on('newRTCSession', on('newRTCSession')); */

            this.addEventHandler(options.eventHandlers || {});
            return ua;
        } catch (error) {
            debug('login error %s', error.message);
        }
    },
    addEventHandler: function(eventHandlers){
        var ua = this.ua;
        for( var eventType in eventHandlers ){
            var eventHandler = eventHandlers[eventType] || null;
           if(JsSIP.Utils.isFunction(eventHandler)){
                debug('%s:%O', type, data);
                // ua.on(eventType, eventHandler.bind(this, data));
                ua.on(eventType, eventHandler(data));
                // ua.on(eventType, eventHandler.bind(this.adaptor, data));
            } else {
                debug('no callback function!');
            }
        }
    },
    addMethodHander: function() {
    },
};


var SIPUAEventHandlers = {
    registered: function(data) {
        this.status = C.STATUS_SUCCESS;
    },
    unregistered: function(data){
        this.status = C.STATUS_FAIL;
    },
    registrationFailed: function(data){
        this.status =  C.STATUS_FAIL;

            // 连接状态  请求超时pending、响应超时 408、410、420、480  UNAVAILABLE 
        var ua = this.ua;
        var isResistered = ua.isRegistered(); // 是否有注册成功过
        var isConnected = ua.isConnected();

        /* 连接状态 请求超时 */
        var isResponseTimeout = data.cause && data.cause === 'UNAVAILABLE';
        var isRequestTimeout = data.cause && data.cause === 'Request Timeout';
        var isConnectTimeOut = isRequestTimeout || isResponseTimeout;
        // 若是响应超时避免服务器集结压力过大做时间缓冲, 区间为5s
        var isValidRegister = !this.timestampRegister || (Math.abs(Date.now() - this.timestampRegister)/1000 > 5);
        if(isConnected && isConnectTimeOut && isValidRegister ) {
            this.timestampRegister = Date.now();
            log('ws服务注册失败-重试');
            ua.register();// 未注册成功过 或 注册成功过isResistered 则关闭 一个周期仅触发一次 ua.registered  ua.registrator.close();
        } else {
            var isConnectError = data.cause && data.cause === 'Connection Error';
            this.uaConnectError = isConnectError;
            log('ws服务注册失败-重连 连接错误 %s', this.uaConnectError);
        }
    },
    connected: function(data){
        this.connected = true;
        this.reconnect = 0;
        this.callingReconnect = false;
        sipServer.log('ws服务连接成功');
        // p.loginStatus = LOGIN_STATUS.CODE.SUCCESS;
        // sipServer.nofity(false, { code: sipServerInfo.Code.SIP_SUCCESS});
    },
    disconnected: function(data){
        this.status =  C.STATUS_FAIL;
        socketDisconnectedNLB.apply(this, data);
    },
    newRTCSession: function(data){
        if (data.originator === 'local') return;

        var _session = data.session;
        var adaptor = this;

        // Avoid if busy or other incoming
        if (adaptor._session) {
            debug('[terminate] %O', { // debug
                status_code: 486,
                reason_phrase: 'Busy Here',
                session: _session
            });

            session.terminate({
                status_code: 486,
                reason_phrase: 'Busy Here'
            });
            return;
        }
        
        adaptor._session = _session;

        adaptor.fireEvent('ringing', {
            type: data.request.hasHeader('Direction-Type') ? Number(data.request.getHeader('Direction-Type')) : 1
        });

        _session.on('accepted', function() {
                // window.document.getElementById('qiyuPhone') idSelector
            var nodePhone = window.document && (nodePhone = window.document.getElementById(adaptor._configration.media.idSelector));
            if (nodePhone) {
                // Display remote stream
                nodePhone.srcObject = session.connection.getRemoteStreams()[0];
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


var  sessionMethods = {
    answer: function(options, done){
        this._session && this._session.answer(deepmerge(options || {}, this._configrationCommon));
    },
    bye: function(options, done){
        this._session && this._session.terminate(deepmerge(options || {}, this._configrationCommon));
    },
    hold: function(options, done){
        this._session && this._session.hold(deepmerge(options || {}, this._configrationCommon));
    },
    unhold: function(options, done){
        this._session && this._session.unhold(deepmerge(options || {}, this._configrationCommon));
    },
    mute: function(options, done){
        this._session && this._session.mute(options);
    },
    unmute: function(options, done){
        this._session && this._session.unmute(options);
    },
    sendDigit: function(tone, done){
        this._session && this._session.sendDTMF(tone);
    },
};
var sdk = {
    JsSIP: JsSIP,
    debug: JsSIP.debug,
    DebugWebRTC: require('debugwebrtc'),
    C: C,
    status: C.STATUS_INIT,
    /** 
     * @param options {ua, socket, media:{ idSelector }, extraHeaders, eventHandlers, methordHandlers }
     * @property  { ua, scoket }  SIP代理初始化需求
     * @property  media { idSelector, pcConfig }  idSector音频输入DOM选择器  
     *     dom示例：<video id = "qiyuPhone" autoPlay style="position: fixed; z-index: -1; opacity:0"></video>
     * @property  extraHeaders  JSSIP.UA 注册请求头部设置 || JSSIP.SessionRTC 方法传参-请求头部
     * @property  eventHandlers  JSSIP.UA 事件监听
     * @property  methordHandlers JSSIP.UA 方法回调
    */
    init: function(options) {
        this._configration = Object.assign({}, options); //缓存extraHeaders信息，其它接口使用
        this.ua = SIPUA.init({ 
            ua: options.ua, socket: options.socket, 
            eventHandlers:  SIPUAEventHandlers
        }, this);
        this._configrationCommon = {
            extraHeaders: options.extraHeaders.slice()
        };

        // this.addMethodHanders();
        return this;
    },
    call: function (target, options) {
        return this.ua.call( target, deepmerge(options || {}, this._configrationCommon) );
    },
    session: sessionMethods,
    addMethodHanders: function() {
        // otherMehtods isInProgress,isEstablished,isEnded,isReadyToReOffer,isOnHold,mute,unmute,isMuted,resetLocalMedia,
        /* ['answer', 'terminate',
        'sendDTMF', 'sendInfo',
        'hold', 'unhold',
        'renegotiate',
        'refer'].includes(method) */
        /* const extraHeadersMethods = [
            ''
        ]; */
        
    }
};

 module.exports = sdk;