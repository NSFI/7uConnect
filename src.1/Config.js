
var C = {
  SOCKET_TYPE: {
    NLB: 0,
    LBS: 1
  }
}
const ConfigurationError =  Error; //Exceptions.ConfigurationError;

var isEmpty = function(value){
   return (value === null ||
      value === '' ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof(value) === 'number' && isNaN(value)));
}

// business
exports.defaultConfig = {
    /* SIP authentication. */
    password:  null, // required
    /* SIP account. */
    uri: {
      // sip_portocal: null, // required
      // username  : null,  // required
      // sip_domain: null,  // required
      // sip_transport: null,
      portocal: 'sip:', // required
      account: null, // required
      domain: '@cc.qiyukf.com'  // required
    },
    portocal: null, // contant_uri -> transport ; ua sockets -> portocal
    pcConfig: null,
    /* Connection options. */
    socket: {
      type: C.SOCKET_TYPE.NLB, // 0: nlb(National Load Balancing) 固定服务   1: lbs(Location Based Service) 动态服务   // required
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
    meida_whitelist: null, //
    corpCode: '',  // required
    appId: ''  // required
};

exports.settings = {
   /* 代理配置信息 */
   ua: {
      /* SIP authentication. */
      // authorization_user : null,
      password           : null, //calluser.password,
      // realm              : null,
      // ha1                : null,

      /* SIP account. */
      // display_name : null,
      uri        : null, //`sip:${username}${QiyuConfig.sip_url}` <= { portocal, account: null, domain: null , transport} 
      contact_uri: null,//sip:${calluser.username}${QiyuConfig.sip_url};transport=${location.protocol.replace('http', 'ws').replace(':','')}`

      /* Session parameters. */
      session_timers                : false, // true,
      session_timers_refresh_method : JsSIP_C.UPDATE,
      no_answer_timeout             : 60,

      /* Registration parameters. */
      // register         : true,
      register_expires : 100, //600,
      // registrar_server : null,

      /* Connection options. */
      sockets                          : null,
      // connection_recovery_max_interval : JsSIP_C.CONNECTION_RECOVERY_MAX_INTERVAL,
      // connection_recovery_min_interval : JsSIP_C.CONNECTION_RECOVERY_MIN_INTERVAL,

      // connection_recovery_min_interval: 1, // 重连最小周期
      connection_recovery_max_interval: 4, // 重连最大周期
   },
   /* 会话配置信息 */
  session: { 
     // goouting:  ua.call(target, options) -> session.connect(target, options)
     // -> createRTCConnection: session._createRTCConnection(pcConfig, rtcConstraints) <= {pcConfig}
     // -> newRTCSession: session._newRTCSesstion(['local', 'remote'],_request) -> ua.newRTCSession('newRTCSession',{originator, session, request}) -> emitEventHanderBusiness <= extraHeaders
     // incoming: session.answer(options)  
     // -> createRTCConnection: session._createRTCConnection(pcConfig, rtcConstraints) <= {pcConfig}
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
      // rtcConstraints: null,
      // eventHandlers: null, // {} 
      // rtcOfferConstraints: null,
      // rtcAnswerConstraints
      // -
      // sessionTimersExpires: JsSIP_C.SESSION_EXPIRES  // max: JsSIP_C.MIN_SESSION_EXPIRES
  },
  extraHeaders: null,
  socket: null
};

exports.checks = {
  mandatory: {
    socket: function(options){
      const { type, nlb, lbsAPI}  = options;
      switch(type){
        case C.SOCKET_TYPE.NLB:
            if(!!nlb) { 
              return options;
            }
          break;
        case C.SOCKET_TYPE.LBS:
            if(!!lbsAPI) { 
              return options;
            }
          break;
        default: return;
      } 
      return; 
    },
    // // contant_uri -> transport ; ua sockets -> portocal
    portocal: function(portocal){
      if(portocal){
        return String(portocal);
      } else {
        return location.protocol.replace('http', 'ws').replace(':','');
      }
    },
    appId: function(appId) {
      if(!!appId) {
        return String(appId);
      } else {
        return;
      }
    },
  },
  optional: {
    password: function(password) {
       return String(password);
    },
    uri: function(options) {
       let _uri = Object.values(options);
      if(_uri.length && !(/(null|undefined|'')/g).test(JSON.stringify(_uri)) ){
         return _uri.join('');
      }else {
        return;
      }
    },
    corpCode: function(code){
       return String(code);
    },
    meida_whitelist: function(whitelist) {
       if(Array.isArray(whitelist)){
         return whitelist;
       } else {
         return;
       }
    }
  }
};

exports.load = function(dst, src) {
    // Check Mandatory parameters.
    for (const parameter in checks.mandatory){
      if (!src.hasOwnProperty(parameter)){
          const value = src[parameter];
          const checked_value = checks.mandatory[parameter](value);
          if (checked_value !== undefined){
            // dst[parameter] = src[parameter];
            switch(parameter){
              case 'appId':
                dst.extraHeaders = [`App-ID:${checked_value}`];
              default:
                dst[parameter] = checked_value;
              return;
            }
          } else {
            throw new ConfigurationError(parameter, value);
          }
      } else {
        throw new ConfigurationError(parameter);
      }
    }

    // Check Optional parameters.
    for (const parameter in checks.optional) {
      if (src.hasOwnProperty(parameter)){
        const value = src[parameter];
        /* null, empty string, undefined, empty array, [empty object @]  */
        if (isEmpty(value)){
          continue;
        }
        const checked_value = checks.optional[parameter](value);
        if (checked_value !== undefined){ 
            switch(parameter){
              case 'password':
                dst.ua.password = checked_value;
                break;
              case 'uri':
                dst.ua.uri = checked_value;
                dst.ua.contact_uri = `${checked_value};transport=${dst.portocal}`; //portocal <=location.protocol.replace('http', 'ws').replace(':','')
                break;
              case 'corpCode':
                dst.corpCode = checked_value;
                break;
              default:
                dst[parameter] = checked_value;
              return;
            }
        } else {
          throw new ConfigurationError(parameter, value);
          // throw new Exceptions.ConfigurationError(parameter, value);
        }
      }
    }
    // ……
};