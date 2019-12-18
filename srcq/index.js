/**
 * Dependencies.
 */

var pkg = require('../package.json');
var JsSIP = require('qiyujssip');
var debug = JsSIP.debug('QiyuConnect');
var deepmerge = require('deepmerge');


debug('version %s', pkg.version);


var QiyuAdaptor = module.exports = {
    init: init,
    getCause: getCause,
    accept: accept, // 接起
    disConnect: disConnect, // 断开连接
    connect: connect, // 重新连接
    login: login,
    call: call,
    answer:  function(options) {
        if(this.session) {
            answer(this.session, options);
        }
    },
    bye: function(options) {
        if(this.session) {
            bye(this.session, options);
        }
    },
    sendDigit: function(tone) {
        if(this.session) { 
            sendDigit(this.session, tone);
        }
    },
    addEventMethod: addEventMethod
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
module.QiyuConnect = {
    Utils: JsSIP.Utils,
    init: init,
    getCause: getCause,
    accept: accept, // 接起
    disConnect: disConnect, // 断开连接
    connect: connect, // 重新连接
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
    addEventMethod: addEventMethod,
    DebugWebRTC: require('debugwebrtc')
};

/* Object.defineProperties(QiyuConnect, {
    name: {
        get: function() {
            return pkg.siptitle;
        }
    },
    version: {
        get: function() {
            return pkg.sipversion;
        }
    }
}); */

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
    },
};

var config = {
  // business
  defaultConfig: {
      /* SIP authentication. */
      password:  null, // required
      /* SIP account. */
      uri: {
        // sip_portocol: null, // required
        // username  : null,  // required
        // sip_domain: null,  // required
        // sip_transport: null,
        portocol: 'sip:', // required
        account: null, // required
        domain: '@cc.qiyukf.com'  // required
      },
      portocol: null, // contant_uri -> transport ; ua sockets -> portocol
      pcConfig: null,
      /* Connection options. */
      socket: {
        type: 0, // 0: nlb(National Load Balancing) 固定服务   1: lbs(Location Based Service) 动态服务   // required
        // socket: null,  // required
        nlb: null,  // https://aws.amazon.com/cn/blogs/china/overview-of-nlb/
        lbsAPI: null,  //  
        lbsLocal: null, // []  selectable
        lbsRemote: null, // [] 
      },
      /* session Options */
      // eventHandlers: null, //{}

      /* bussiness corporation  */
      // bu_extraHeaders: {},
      meida_whitelist: [], //
      corpCode: '',  // required
      appId: ''  // required
  },

  settings: {
    /* 代理配置信息 */
    ua: {
        /* SIP authentication. */
        // authorization_user : null,
        password           : null, //calluser.password,
        // realm              : null,
        // ha1                : null,

        /* SIP account. */
        // display_name : null,
        uri        : null, //`sip:${username}${QiyuConfig.sip_url}` <= { portocol, account: null, domain: null , transport} 
        contact_uri: null,//sip:${calluser.username}${QiyuConfig.sip_url};transport=${location.protocol.replace('http', 'ws').replace(':','')}`

        /* Session parameters. */
        session_timers                : false, // true,
        // session_timers_refresh_method : JsSIP_C.UPDATE,
        no_answer_timeout             : 60,

        /* Registration parameters. */
        // register         : true,
        register_expires : 100, //600,
        // registrar_server : null,

        /* Connection options. */
        // sockets                          : null,
        // connection_recovery_max_interval : JsSIP_C.CONNECTION_RECOVERY_MAX_INTERVAL,
        // connection_recovery_min_interval : JsSIP_C.CONNECTION_RECOVERY_MIN_INTERVAL,

        // connection_recovery_min_interval: 1, // 重连最小周期
        connection_recovery_max_interval: 4, // 重连最大周期
    },
    /* 会话配置信息 */
    session: { 
      // goouting:  ua.call(target, options) -> session.connect(target, options)
      // -> createRTCConnection: session._createRTCConnection(pcConfig, rtcvarraints) <= {pcConfig}
      // -> newRTCSession: session._newRTCSesstion(['local', 'remote'],_request) -> ua.newRTCSession('newRTCSession',{originator, session, request}) -> emitEventHanderBusiness <= extraHeaders
      // incoming: session.answer(options)  
      // -> createRTCConnection: session._createRTCConnection(pcConfig, rtcvarraints) <= {pcConfig}
      // -> navigator.mediaDevices.getUserMedia()
      // -> session._connecting(request) -> emit('connecting', {request})
      //- common
        mediavarraints: { 
          audio: true, 
          video: false // true
        },
        mediaStream: null,
        pcConfig: null, // { iceServers: [] }
        // extraHeaders: null, // : [ 'App-ID:' + appId] <= appId
        // rtcvarraints: null,
        // eventHandlers: null, // {} 
        // rtcOffervarraints: null,
        // rtcAnswervarraints
        // -
        // sessionTimersExpires: JsSIP_C.SESSION_EXPIRES  // max: JsSIP_C.MIN_SESSION_EXPIRES
    },
    
    extraHeaders: null
  },
  load: function(target, src) {
      target.extraHeaders = ['App-ID:' + src.appId];
      target.ua.password = src.password;
      var uri = Object.assign({},  {
        portocol: 'sip:', // required
        // account: 'account', // required
        domain: '@cc.qiyukf.com'  // required
      }, src.uri);
      var _uri = uri.portocol + uri.account + uri.domain;
      target.ua.uri = _uri;
      var portocol = src.portocol || 'wss';//location.protocol.replace('http', 'ws').replace(':','');
      target.ua.contact_uri = _uri+ ';transport='+portocol;
      target.socket_nlb = src.socket_nlb;
      target.media_selectorId = src.media_selectorId;
      target.meida_whitelist = src.meida_whitelist;
      target.corpCode = src.corpCode;

      return target;
  }
};


function init(configration){
    this.status = C.STATUS_INIT;
    var adaptor = this;
    try{
        navigator.mediaDevices.getUserMedia({
                audio: true
        })
        .then(function() {
            _loadConfig(configration);
            var _configration = adaptor._configration;
            var config = {
                ua: _configration.ua,
                url: _configration.socket_nlb, 
                extraHeaders: _configration.extraHeaders
            };
            console.log(_configration, config);
            login(config);
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

function _loadConfig(configration){
    var target = Object.assign({}, config.settings);

    var src = Object.assign({}, config.defaultConfig, configration ); 
    this._configration = config.load(target, src);
}

function getCause(){
    return C.Cause[this.status];
}

function getStackTrace() {
    var obj = {};
    Error.captureStackTrace(obj, getStackTrace);
    return obj.stack;
}

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
    /* function on(type) {
        return function(data) {
            if (JsSIP.Utils.isFunction(options.callback)) {
                debug('%s:%O', type, data);
                options.callback(type, data);
            } else {
                debug('no callback function!');
            }
        };
    }
 */
    try {

        var ua = this.ua = new JsSIP.UA(deepmerge({
            sockets: new JsSIP.WebSocketInterface(options.url)
        }, options.ua, true));


        ua.__extraHeaders = options.extraHeaders; //缓存extraHeaders信息，其它接口使用
        ua.registrator().setExtraHeaders(ua.__extraHeaders);
        ua.start();
        /* ua.on('connecting', on('connecting'));
        ua.on('connected', on('connected'));
        ua.on('disconnected', on('disconnected'));
        ua.on('registered', on('registered'));
        ua.on('unregistered', on('unregistered'));
        ua.on('registrationFailed', on('registrationFailed'));
        ua.on('newRTCSession', on('newRTCSession')); */
        ua.on('connecting', onConnecting);
        ua.on('connected', onConnected);
        ua.on('disconnected', onDisconnected);
        ua.on('registered', onRegistered);
        ua.on('unregistered', onUnregistered);
        ua.on('registrationFailed', onRegistrationFailed);
        ua.on('newRTCSession', onNewRTCSession);

    } catch (error) {
        debug('login error %s', error.message);
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
function addEventMethod(eventType, eventHandle, scope) {
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

/*UA Event */
// ===== 
// 连接中  ua.on('connecting', onConnecting);
function onConnecting(data){
    debug('[onConnecting] %O', {
        data: data
    });
}
// 连接成功 ua.on('connected', onConnected);
function onConnected(data){
    this.connected = true;
    this.reconnect = 0;
    this.callingReconnect = false;
    debug('[onConnected] %O', {
        data: data
    });
}
// 连接失败 ua.on('disconnected', onDisconnected);
function onDisconnected(data){
    this.status = C.STATUS_FAIL;
    data = data || {};
    var ua = this.ua || {};
    debug('[onDisconnected] %O', {
        data: data,
        socket: data.socket,
        status: ua.status,
        ua: ua
    });

    try {
        // ①若连接成功过之后未连接成功  ②_uaConnectError 避免重复执行 ③ 避免服务器高并发请求集结做缓冲
        var isValidConnect = !this._timestampConnect || (Math.abs(Date.now() - this._timestampConnect)/1000 > 1);
        if(data.error && this._uaConnectError && this._connected && isValidConnect) {
            this._uaConnectError = 0;
            this._timestampConnect = Date.now();
            ua.start();
        }
    } catch (e) {
        debug('[disconnectError]: %O', e );
    }
}
// 注册成功 ua.on('registered', onRegistered);
function onRegistered(data){
    this.status = C.STATUS_SUCCESS;
     debug('[onRegistered] %O', {
        data: data
    });
}
// 注册注销 ua.on('unregistered', onUnregistered);
function onUnregistered(data){
    this.status = C.STATUS_FAIL;
     debug('[onUnregistered] %O', {
        data: data
    });

}
// 注册失败  ua.on('registrationFailed', onRegistrationFailed);
function onRegistrationFailed(data){
    this.status = C.STATUS_FAIL;
    debug('[onRegistrationFailed] %O', {
        data: data
    });

    var ua = this.ua;
    if(!ua) { return ;}
    // 连接状态  请求超时pending、响应超时 408、410、420、480  UNAVAILABLE 
    // var isResistered = ua.isRegistered(); // 是否有注册成功过
    var isConnected = ua.isConnected();

    /* 连接状态 请求超时 */
    var isResponseTimeout = data.cause && data.cause === 'UNAVAILABLE';
    var isRequestTimeout = data.cause && data.cause === 'Request Timeout';
    var isConnectTimeOut = isRequestTimeout || isResponseTimeout;
    // 若是响应超时避免服务器集结压力过大做时间缓冲, 区间为5s
    var isValidRegister = !this.timestampRegister || (Math.abs(Date.now() - this.timestampRegister)/1000 > 5);
    if(isConnected && isConnectTimeOut && isValidRegister ) {
        this.timestampRegister = Date.now();
        debug('ws服务注册失败-重试');
        ua.register();// 未注册成功过 或 注册成功过isResistered 则关闭 一个周期仅触发一次 ua.registered  ua.registrator.close();
    } else {
        var isConnectError = data.cause && data.cause === 'Connection Error';
        this.uaConnectError = isConnectError;
        debug('ws服务注册失败-重连 连接错误 %s', isConnectError);
    }
}

// 获取电话，注册电话事件 ua.on('registrationFailed', onNewRTCSession);
function onNewRTCSession(data){
    if (data.originator === 'local') { return; }
    debug('[onNewRTCSession] %O', {
        data: data
    });
    var _session = data.session;
    // Avoid if busy or other incoming
    if (this.session) {
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
    this.session = _session;

    fireEvent('ringing', {
        type: data.request.hasHeader('Direction-Type') ? Number(data.request.getHeader('Direction-Type')) : 1
    });

    _session.on('accepted', function() {
            // window.document.getElementById('qiyuPhone') idSelector
        var nodePhone = window.document && (nodePhone = window.document.getElementById(this._configration.media_selectorId));
        if (nodePhone) {
            // Display remote stream
            nodePhone.srcObject = _session.connection.getRemoteStreams()[0];
        }
        // stats.startStats(session.connection);
    });
    _session.on('ended', function() {
        debug('jssip:ended');

        // stats.stopStats();
        this.session = null;
    });
    _session.on('failed', function() {
        debug('jssip:failed');
        // stats.stopStats();
        this.session = null;
    });
}

/* UA Methods */
function connect () {
      if(this.ua) {
        this.ua.start();
    }
      debug('connect %s', getStackTrace());
  }
function disConnect () {
    if(this.ua) {
        this.ua.stop();
    }
    debug('disConnect %s', getStackTrace());
  }
function accept() {
    var adaptor = this;
    var hasAccept = false;//是否接起过
    var _configration = adaptor._configration;
    var answerOptions = _configration.session; //media.pcConfig;

    // 重试机制白名单：3次重试
    // var someCode = ['7','ipcc1213','gamesbluebc','wmccs','yimutian','7daichina','5050sgmw','siji','bluebc'];//这里的企业，在接起时获取媒体设备，如果没有返回，增加重试机制
    var retryCount = 0;//重试次数
    var retryTimer = null; //重试定时器

    var  retryCorpWhiteList = _configration.meida_whitelist || []; //_configration.meida.whitelist;
    var  TheCorp = _configration.corpCode;

    debug('accept corpCode:%s', TheCorp);
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

        debug('retry retryCount:%d', retryCount);

        //重试次数小于3次时，起一个定时器，如果navigator.mediaDevices.getUserMedia没有返回，定时器触发，重试。
        if (retryCount < 3){ 
            retryTimer = setTimeout(retryGetUserMedia, 200);
        }

        try{
            navigator.mediaDevices.getUserMedia({audio: true, video: false}).then(function(stream) {
                clearTimeout(retryTimer);
                debug('getUserMedia success hasAccept:%d', Number(hasAccept));

                if(!hasAccept){//防止多次调用：如果navigator.mediaDevices.getUserMedia返回就是很慢，三次重试过了，然后同时返回成功，此时防止接起多次
                    answerOptions.mediaStream = stream;
                    answer(adaptor.session, answerOptions);
                    hasAccept = true;
                }

            }).catch(function(error) {
                debug('getUserMedia failed %O', error);
            });
        }catch(e){
            console.log(e);
        }
    }
}



/**
 * @param  {String} 呼叫目标
 * @param  {Object} options 可选的扩展对象
 */
function call(target, options) {
    return this.ua.call(target, deepmerge(options || {}, {
        extraHeaders: this.ua.__extraHeaders.slice()
    }));
}
/**
 * @param  {Obejct} 可选参数用于以后扩展
 */
function answer(session, options) {
    session.answer(deepmerge(options || {}, {
        extraHeaders: this.ua.__extraHeaders.slice()
    }));
}

function bye(session, options) {
    session.terminate(deepmerge(options || {}, {
        extraHeaders: this.ua.__extraHeaders.slice()
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
        extraHeaders: this.ua.__extraHeaders.slice()
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
        extraHeaders: this.ua.__extraHeaders.slice()
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