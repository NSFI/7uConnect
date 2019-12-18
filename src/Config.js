
// business
var defaultConfig = {
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
    meida_whitelist: null, //
    corpCode: '',  // required
    appId: ''  // required
};

var settings = {
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
      sockets                          : null,
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
};



var load = function(target, src) {
    target.extraHeaders = ["App-ID:" + src.appId];
    target.ua.password = src.password;
    var uri = Object.assign({},  {
      protocol: 'sip:', // required
      // account: 'account', // required
      domain: '@cc.qiyukf.com'  // required
    }, src.uri);
    var _uri = uri.portocol + uri.account + uri.domain;
    target.ua.uri = _uri;
    var portocol = src.portocol || 'wss';//location.protocol.replace('http', 'ws').replace(':','');
    target.ua.contact_uri = _uri+ ";transport="+portocol;
    target.socket_lbs = src.socket_lbs;

    return target;
};
// var deepmerge = require('deepmerge');

var target = Object.assign({}, settings);

var src = Object.assign({}, defaultConfig, {
    /* SIP authentication. */
    password:  'password', // required
    uri: {
      portocol: 'sip:', // required
      account: 'account', // required
      domain: '@cc.qiyukf.com'  // required
    },
    socket_lbs: 'wss://ipcc2.qytest.netease.com:8443',  // https://aws.amazon.com/cn/blogs/china/overview-of-nlb/
    corpCode: 'corpCode',  // required
    appId: 'appId'  // required
});

load(target, src);
console.log(target);

