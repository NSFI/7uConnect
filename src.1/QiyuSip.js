/** 
 * ￼SIP 适配器主要负责JSSIP与底层对接的SIP处理及业务个性化配置
 * 功能列表
 * * 通话对象RTCSession方法 API 预处理
 * * 通话对象RTCSession方法 通话业务侧使用媒体对象处理
 * * SIP代理初始化配置
 * * SIP代理初始化结果 业务侧容错机制
*/
var AdaptorUA = require('./QiyuConnect');
var config = require('./Config');
var deepmerge = require('deepmerge');

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


// Utils 

var Utils = {
  getStackTrace: function() {
      var obj = {};
      Error.captureStackTrace(obj, getStackTrace);
      return obj.stack;
  },
  debug: function _debug (type, options=undefined){
      let args = Array.prototype.slice.call(_debug.arguments);
      console && (console.log).apply(this, args);
  },
  log: function _log (type, options=undefined){
      let args = Array.prototype.slice.call(_log.arguments);
      console && (console.log).apply(this, args);
  }
};


var debug = Utils.debug;
var log = Utils.log;
var getStackTrace = Utils.getStackTrace;



function addEventHandlersSIPUA(type, data) {
  var addEventHandlersSIPUA = {
      registered: function(data, cb){
        // this._adaptor.setStatus(SIPAdaptor_C.LBS_SUCCESS);
        // p.status = ERROR_TYPE.SUCCESS;
        this.onregistered(data);
          // this.emit('registered');
          // this._adaptor._status = Constants.Status.SUCCESS;
      },
      // connecting: function(data, cb) {},
      connected: function(data, cb) {
        // this.emit('connected');
        log('ws服务连接成功');
          this._connected = true;
          this._reconnect = 0;
          this._callingReconnect = false;
          if(this._configration.socketType === Constants.SIP_SOCKET_TYPE.LBS){
              // lbs status && socket status
              // adaptor._lbsStatus = LOGIN_STATUS.CODE.SUCCESS;
              // sipServer.nofity(false, { code: sipServerInfo.Code.SIP_SUCCESS}); 
              this.setLBSStatus(SIPAdaptor_C.LBS_SUCCESS);
          }
      },
      disconnected: function(data, cb) {
        this.ondisconnected(data);
        // this.emit('disconnected');
      },
      registered: function(data, cb) {
        this.ondisconnected(data);
        // this.emit('registered');
      },
      unregistered: function(data, cb) {
        // this.emit('unregistered');
        this.onunregistered(data);
      },
      registrationFailed: function(data={}, cb) {
          this.onregistrationFailed(data);// adaptor._status = Constants.Status.INIT_FAIL;

          // 连接状态  请求超时pending、响应超时 408、410、420、480  UNAVAILABLE 
          var ua = this._ua;
          var isResistered = ua.isRegistered(); // 是否有注册成功过
          var isConnected = ua.isConnected();

          debug('[registrationFailed] %O', {
              code: data.code,
              error: data.error,
              reason: data.cause,
              isConnected: isConnected,
              isRegistered: isResistered,
              uaStatus: ua.status,
              ua: ua
              // socket: data.socket
          });

          log('ws服务注册失败');
          /* 连接状态 请求超时 */
          // var isResponseTimeout = data.cause && data.cause === 'UNAVAILABLE';
          // var isRequestTimeout = data.cause && data.cause === 'Request Timeout';
          var isConnectTimeOut = ['UNAVAILABLE','Request Timeout'].includes(data.cause ||''); // isRequestTimeout || isResponseTimeout;
          // 若是响应超时避免服务器集结压力过大做时间缓冲, 区间为5s
          var isValidRegister = !this._timestampRegister || (Math.abs(Date.now() - this._timestampRegister)/1000 > 5);
          if(isConnected && isConnectTimeOut && isValidRegister ) {
              if(this._configration.socketType === Constants.SIP_SOCKET_TYPE.LBS){
                  this._lbs.socketRegisterError();// adaptor._lbsStatus = LOGIN_STATUS.CODE.ERROR;
              }
              this._timestampRegister = Date.now();
              log('ws服务注册失败-重试');
              ua.register();// 未注册成功过 或 注册成功过isResistered 则关闭 一个周期仅触发一次 ua.registered  ua.registrator.close();
          } else {
              var isConnectError = data.cause && data.cause === 'Connection Error';
              this._uaConnectError = isConnectError;
              log('ws服务注册失败-重连 连接错误 %s', this._uaConnectError);
          }
      },
      // registrationExpiring: function(data, cb) {},
      newRTCSession: function(data, cb) {
        if (data.originator === 'local') return;

        var session = data.session;

        // Avoid if busy or other incoming
        if (adaptor.session) {

            debug('[terminate] %O', {
                status_code: 486,
                reason_phrase: 'Busy Here',
                session: adaptor.session
            });

            session.terminate({
                status_code: 486,
                reason_phrase: 'Busy Here'
            });
            return;
        }

        adaptor.session = session;

        p.fireEvent('ringing', {
            type: data.request.hasHeader('Direction-Type') ? Number(data.request.getHeader('Direction-Type')) : 1
        });

        session.on('accepted', function() {

            var nodePhone;
            if (window.document && (nodePhone = window.document.getElementById('qiyuPhone'))) {
                // Display remote stream
                nodePhone.srcObject = session.connection.getRemoteStreams()[0];
            }
            stats.startStats(session.connection);
        });
        session.on('ended', function() {

            debug('jssip:ended');

            stats.stopStats();
            adaptor.session = null;
        });
        session.on('failed', function() {

            debug('jssip:failed');

            stats.stopStats();
            adaptor.session = null;
        });

        break;
      },
      // newMessage: function(data, cb) {},
  };
}


var Adaptor = {
  _status: C.STATUS_INIT,
  getStatus: function(){
    return this._status;
  },
  getCause: function(status) {
      [null,undefined].includes(status) && (status = this._status);
      return C.Cause[status];
  },
  _acceptRetryTimer: null,
  init: function(configration) {
     debug('initQiyu %s', getStackTrace());
        // initQiyu();
        var p = this;
        //如果是pc端，通过PC接口检测权限
        if (window.cefQuery) {
            if (window.location.href.indexOf("https") === -1) {
                adaptor._status = C.STATUS_UNSAFE;
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

                        if (error.name == 'NotAllowedError') {
                            adaptor._status = C.STATUS_MIC_UN;
                        } else if (error.name == 'NotFoundError' || error.name == 'DevicesNotFoundError') {
                            adaptor._status = C.STATUS_MIC_NOT;
                        } else if (error.name == 'NotSupportedError') {
                            adaptor._status = C.STATUS_UNSAFE;
                        }
                    });
            }catch(e){
                // TypeError: Cannot read property 'getUserMedia' of undefined
                if(location.protocol !="https:"){
                    adaptor._status = C.STATUS_UNSAFE;
                }
                console.log(e)
            }
        } 
  },
  start: function(configuration) {
    this._configration = Object.assign({}, Config.settings);
    // Load configuration.
    try {
        var _config = Object.assign({}, config.defaultConfig);
        configuration = deepmerge(_config, configuration);
        this._loadConfig(configuration);
        config.load(this._configration, configuration);

      var config = {
        url: this._configration.socket.nlb,
        ua: this._configration.ua,
        callback: addEventHandlersSIPUA,
        extraHeaders: this._configration.extraHeaders
      };
      AdaptorUA.login(this._configration);
        
    } catch (e) {
        this._status = C.STATUS_NOT_READY;
        this._error = C.CONFIGURATION_ERROR;
        throw e;
    }

    // AdaptorUA
  },
  // autoSwitch 是否为用户手动变更状态
  connect: function(autoSwitch, options) {
      const adaptor = this;
      adaptor.sdk.ua && adaptor.sdk.ua.start();
      debug('connect %s', getStackTrace());
  },
  disConnect: function() {
      const adaptor = this;
      adaptor.sdk.ua && adaptor.sdk.ua.stop();
      sipServer.set('isWorking', false); // sipServer.isWorking = false;
      adaptor.forceStop = true; // 强制停止连接：手动切状态、云信事件下发事件强制断开等；
      debug('disConnect %s', getStackTrace());
  },
  accept: function() {
      var adaptor = this;
      // 重试机制白名单：3次重试
      // var someCode = ['7','ipcc1213','gamesbluebc','wmccs','yimutian','7daichina','5050sgmw','siji','bluebc'];//这里的企业，在接起时获取媒体设备，如果没有返回，增加重试机制
      var retryCount = 0;//重试次数
      var retryTimer = null; //重试定时器

      const retryCorpWhiteList = this._configration.meida_whitelist; //this._configration.meida.whitelist;
      const TheCorp = this._configration.corpCode;

      debug('accept corpCode:%s', this._configration.corpCode);
       if (retryCorpWhiteList.includes(TheCorp)) {
          retryGetUserMedia();
      } else {// 非白名单直接接听处理 // 非someCode里定义的企业保持原有的逻辑
          adaptor.session && adaptor.sdk.answer(adaptor.session, answerOptions);
      }

      var hasAccept = false;//是否接起过
      var answerOptions = adaptor.getConfigigrationByFlag('media');
      // adaptor.RTCConfig && (answerOptions.pcConfig = adaptor.RTCConfig);

      function retryGetUserMedia() {
          retryCount++;
          // adaptor._acceptRetryTimer = null;
          retryTimer = null;

          debug('retry retryCount:%d', retryCount);

          //重试次数小于3次时，起一个定时器，如果navigator.mediaDevices.getUserMedia没有返回，定时器触发，重试。
          if (retryCount < 3)
              // adaptor._acceptRetryTimer = setTimeout(retry, 200);
              retryTimer = setTimeout(retryGetUserMedia, 200);
          try{
              navigator.mediaDevices.getUserMedia({audio: true, video: false}).then(function(stream) {
                  clearTimeout(retryTimer);
                  debug('getUserMedia success hasAccept:%d', Number(hasAccept));

                  if(!hasAccept){//防止多次调用：如果navigator.mediaDevices.getUserMedia返回就是很慢，三次重试过了，然后同时返回成功，此时防止接起多次
                      answerOptions.mediaStream = stream;
                      adaptor.session && adaptor.sdk.answer(adaptor.session, answerOptions);
                      hasAccept = true;
                  }

              }).catch(function(error) {
                  debug('getUserMedia failed %O', error);
              });
          }catch(e){
              console.log(e)
          }
      }

    
     
  },
  bye: function() {
      const adaptor = this;
      adaptor.session && adaptor.sdk.bye(adaptor.session);
  },
  /* Emitter */
  /**
   * 注册事件到该模块上
   * @param {[String]}   eventType   事件句柄
   * @param {Function} eventHandle  事件处理
   * @param {[this]}   scope    注册模块，默认为当前模块
   */
  addEventMethod: function(eventType, eventHandle, scope) {
      if (typeof eventType === 'string') {
          EVENTS_CUSTOM[eventType] = function() {
              eventHandle.apply(scope, Array.prototype.slice.call(arguments));
          }
      }
  },
    /**
   * 触发注册事件
   * @param {[String]}   eventType   事件句柄
   * @param {Object} options  事件处理所需参数 
   */
  fireEvent: function(eventType, options) {
      if (typeof EVENTS_CUSTOM[eventType] === 'function') {

          debug('fireEvent %s %O', eventType, options);

          EVENTS_CUSTOM[eventType](eventType, options);
      }
  },
};

module.exports = Adaptor;