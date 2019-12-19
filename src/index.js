// qiyuSIP
var sipsdk = require('./QiyuConnect');
var pkg = require('../package.json');

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

function getStackTrace() {
    var obj = {};
    Error.captureStackTrace(obj, getStackTrace);
    return obj.stack;
}
var debug = function _debug (type, options){// type, options
    // let args = Array.prototype.slice.call(_debug.arguments);
    // console && (console.log).apply(this, args);
    console.log(type, options);
};

var log = function _log (type, options){ //type, options
    // let args = Array.prototype.slice.call(_log.arguments);
    // console && (console.log).apply(this, args);
    console.log(type, options);
};


var config = {
  // business
  defaultConfig: {
      /* SIP authentication. */
      password:  null, // required
      /* SIP account. */
      uri: {
        // sip_protocol: null, // required
        // username  : null,  // required
        // sip_domain: null,  // required
        // sip_transport: null,
        protocol: 'sip:', // required
        account: null, // required
        domain: '@cc.qiyukf.com'  // required
      },
      protocol: null, // contant_uri -> transport ; ua sockets -> protocol
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
        uri        : null, //`sip:${username}${QiyuConfig.sip_url}` <= { protocol, account: null, domain: null , transport} 
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
        mediaConstraints: { 
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
        protocol: 'sip:', // required
        // account: 'account', // required
        domain: '@cc.qiyukf.com'  // required
      }, src.uri);
      var _uri = uri.protocol + uri.account + uri.domain;
      target.ua.uri = _uri;
      var protocol = src.protocol || 'wss';//location.protocol.replace('http', 'ws').replace(':','');
      target.ua.contact_uri = _uri+ ';transport='+protocol;
      target.socket_nlb = src.socket_nlb;
      target.media_selectorId = src.media_selectorId;
      target.meida_whitelist = src.meida_whitelist;
      target.corpCode = src.corpCode;

      return target;
  }
};


var SIPUAEventHandlers = {
    registered: function() {
        this.status = C.STATUS_SUCCESS;
    },
    unregistered: function(){
        this.status = C.STATUS_FAIL;
    },
    registrationFailed: function(data){
        this.status =  C.STATUS_FAIL;

            // 连接状态  请求超时pending、响应超时 408、410、420、480  UNAVAILABLE 
        var ua = this.ua;
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
            log('ws服务注册失败-重试');
            ua.register();// 未注册成功过 或 注册成功过isResistered 则关闭 一个周期仅触发一次 ua.registered  ua.registrator.close();
        } else {
            var isConnectError = data.cause && data.cause === 'Connection Error';
            this.uaConnectError = isConnectError;
            log('ws服务注册失败-重连 连接错误 %s', this.uaConnectError);
        }
    },
    connected: function(){
        this.connected = true;
        this.reconnect = 0;
        this.callingReconnect = false;
        log('ws服务连接成功');
    },
    disconnected: function(data){
        this.status =  C.STATUS_FAIL;
        socketDisconnectedNLB.apply(this, data);
    },
    newRTCSession: function(data){
        if (data.originator === 'local') { return; }

        var _session = data.session;
        var adaptor = this;

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

        adaptor.fireEvent('ringing', {
            type: data.request.hasHeader('Direction-Type') ? Number(data.request.getHeader('Direction-Type')) : 1
        });

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



/* //用户自定义定制事件
let EVENTS_CUSTOM = {
    //  'ringing', //来电事件
    //  'call', //pc端唤起拨号
    //  'warning',//提示用户重启浏览器  
    //  'jitterbuffer' //拨号中上报延迟信息
}; */

var Adaptor = {
  SIPUAEventHandlers: SIPUAEventHandlers,
  sdk: sipsdk,
  status: C.STATUS_INIT,
  getStatus: function(){
    return this.status;
  },
  getCause: function(status) {
      if([null,undefined].includes(status)){
        status = this.status;
      }
      return C.Cause[status];
  },
  init: function(configuration) {
    var adaptor = this;
     debug('initQiyu %s', getStackTrace());
        // initQiyu();
        //如果是pc端，通过PC接口检测权限
        if (window.cefQuery) {
            if (window.location.href.indexOf('https') === -1) {
                adaptor.status = C.STATUS_UNSAFE;
                return;
            }
            window._nativeApi.detectAudioDevice();
        } else {
            try{
                navigator.mediaDevices.getUserMedia({
                        audio: true
                    })
                    .then(function() {
                        // adaptor.sdk.login(loginConfig);
                        // sipServer.init();
                        adaptor.start(configuration);
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
            }catch(e){
                // TypeError: Cannot read property 'getUserMedia' of undefined
                if(location.protocol !== 'https:'){
                    adaptor.status = C.STATUS_UNSAFE;
                }
                console.log(e);
            }
        } 
  },
  start: function(configuration) {
    // var adaptor = this;
    // Load configuration.
    try {
        this._loadConfig(configuration);
        if(this.ua) {
          this.ua.stop();
        }

        sipsdk.login({
           ua: this._configration.ua,
           url: this._configration.socket_nlb,
           callback: notifyQiyu,
           extraHeaders: this._configration.extraHeaders
          //  callback: function(type, data) {
          //    if(SIPUAEventHandlers.hasOwnProperty(type) &&
          //       Object.prototype.toString.call(SIPUAEventHandlers[type]) === '[object Function]'
          //     ){
          //       SIPUAEventHandlers[type](adaptor, data);
          //    }
          //  } 
        });
        this.ua = sipsdk.ua;

      /* var config = {
        socket: this._configration.socket.nlb,
        ua: this._configration.ua,
        extraHeaders: this._configration.extraHeaders,
        media_selectorId: this._configration.media.selectorId,
        eventHandlers: SIPUAEventHandlers
      }; */

      // this.adaptor.sdk.init(config);
        
    } catch (e) {
        this.status = C.STATUS_NOT_READY;
        this._error = C.CONFIGURATION_ERROR;
        throw e;
    }

    // AdaptorUA
  },
  // {
  //       /* SIP authentication. */
  //       password:  'password', // required
  //       uri: {
  //         protocol: 'sip:', // required
  //         account: 'account', // required
  //         domain: '@cc.qiyukf.com'  // required
  //       },
  //       socket_nlb: 'wss://ipcc2.qytest.netease.com:8443',  // https://aws.amazon.com/cn/blogs/china/overview-of-nlb/
  //       corpCode: 'corpCode',  // required
  //       appId: 'appId',  // required
  //       media: {
  //         selectorId: 'id'
  //       }
  //   }
  _loadConfig: function(configration){
    var target = Object.assign({}, config.settings);

    var src = Object.assign({}, config.defaultConfig, configration ); 
    this._configration = config.load(target, src);
  },
  // autoSwitch 是否为用户手动变更状态
  connect: function() {
      var  adaptor = this;
      if(adaptor.sdk.ua) {
        adaptor.sdk.ua.start();
      }
      debug('connect %s', getStackTrace());
  },
  disConnect: function() {
      var  adaptor = this;
      if(adaptor.sdk.ua) {
       adaptor.sdk.ua.stop();
      }
      debug('disConnect %s', getStackTrace());
  },
  accept: function() {
      var adaptor = this;
      var hasAccept = false;//是否接起过
      var answerOptions = this._configration.session; //media.pcConfig;
      // adaptor.RTCConfig && (answerOptions.pcConfig = adaptor.RTCConfig)

      // 重试机制白名单：3次重试
      // var someCode = ['7','ipcc1213','gamesbluebc','wmccs','yimutian','7daichina','5050sgmw','siji','bluebc'];//这里的企业，在接起时获取媒体设备，如果没有返回，增加重试机制
      var retryCount = 0;//重试次数
      var retryTimer = null; //重试定时器

      var  retryCorpWhiteList = this._configration.meida_whitelist || []; //this._configration.meida.whitelist;
      var  TheCorp = this._configration.corpCode;

      debug('accept corpCode:%s', this._configration.corpCode);
       if (retryCorpWhiteList.includes(TheCorp)) {
          retryGetUserMedia();
      } else {// 非白名单直接接听处理 // 非someCode里定义的企业保持原有的逻辑
        if(adaptor._session){
          adaptor.sdk.answer(adaptor._session, answerOptions);
        }
      }

      function retryGetUserMedia() {
          retryCount++;
          // adaptor._acceptRetryTimer = null;
          retryTimer = null;

          debug('retry retryCount:%d', retryCount);

          //重试次数小于3次时，起一个定时器，如果navigator.mediaDevices.getUserMedia没有返回，定时器触发，重试。
          if (retryCount < 3){ 
              // adaptor._acceptRetryTimer = setTimeout(retry, 200);
            retryTimer = setTimeout(retryGetUserMedia, 200);
          }

          try{
              navigator.mediaDevices.getUserMedia({audio: true, video: false}).then(function(stream) {
                  clearTimeout(retryTimer);
                  debug('getUserMedia success hasAccept:%d', Number(hasAccept));

                  if(!hasAccept){//防止多次调用：如果navigator.mediaDevices.getUserMedia返回就是很慢，三次重试过了，然后同时返回成功，此时防止接起多次
                      answerOptions.mediaStream = stream;
                      adaptor.sdk.answer(answerOptions);
                      hasAccept = true;
                  }

              }).catch(function(error) {
                  debug('getUserMedia failed %O', error);
              });
          }catch(e){
              console.log(e);
          }
      }

    
     
  },
  bye: function() {
      var  adaptor = this;
      adaptor.sdk.bye(adaptor._session);
  },
  /* Emitter */
  /**
   * 注册事件到该模块上
   * @param {[String]}   eventType   事件句柄
   * @param {Function} eventHandle  事件处理
   * @param {[this]}   scope    注册模块，默认为当前模块
   */
  EVENTS_CUSTOM: {},
  addEventMethod: function(eventType, eventHandle, scope) {
      if (typeof eventType === 'string') {
          this.EVENTS_CUSTOM[eventType] = function() {
              eventHandle.apply(scope, Array.prototype.slice.call(arguments));
          };
      }
  },
    /**
   * 触发注册事件
   * @param {[String]}   eventType   事件句柄
   * @param {Object} options  事件处理所需参数 
   */
  fireEvent: function(eventType, options) {
      if (typeof this.EVENTS_CUSTOM[eventType] === 'function') {

          debug('fireEvent %s %O', eventType, options);

          this.EVENTS_CUSTOM[eventType](eventType, options);
      }
  },
};
function notifyQiyu(type, data) {
      debug('[notifyQiyu] type:%s, data:%O', type, data);
      var adaptor = Adaptor, ua = adaptor.sdk.ua;
      switch (type) {
          case 'registered':
              adaptor.status = C.STATUS_SUCCESS;
              break;
          case 'unregistered':
              adaptor.status = C.STATUS_FAIL;
              break;
          case 'registrationFailed':
              adaptor.status =  C.STATUS_FAIL;

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
                  log('ws服务注册失败-重试');
                  ua.register();// 未注册成功过 或 注册成功过isResistered 则关闭 一个周期仅触发一次 ua.registered  ua.registrator.close();
              } else {
                  var isConnectError = data.cause && data.cause === 'Connection Error';
                  this.uaConnectError = isConnectError;
                  log('ws服务注册失败-重连 连接错误 %s', this.uaConnectError);
              }
              break;
          case 'connected':
              this.connected = true;
              this.reconnect = 0;
              this.callingReconnect = false;
              break;
          case 'disconnected':
              adaptor.status =  C.STATUS_FAIL;
              data = data || {};
              debug('[disconnected] %O', {
                  data: data,
                  isConnected: ua.isConnected(),
                  status: ua.status,
                  ua: ua,
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
                  console.log('disconnect error');
              }

              break;
          case 'newRTCSession':
              if (data.originator === 'local') { return; }

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

              adaptor.fireEvent('ringing', {
                  type: data.request.hasHeader('Direction-Type') ? Number(data.request.getHeader('Direction-Type')) : 1
              });

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

              break;
          default:
              break;
      }
  }

var QiyuAdaptor = module.exports  = Adaptor;

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
