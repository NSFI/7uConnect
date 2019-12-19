# SIP 适配器
    SIP 适配器是七鱼呼叫对SIP通话开源库[JsSIP](https://github.com/versatica/JsSIP)的二次开发，实现SIP通话web端的通讯能力。

## <span id="introduction">SIP适配器使用说明 </span>
    实现web端通话，SIP适配器的使用需满足4个基本步骤。

  1. [SDK 脚本引入](#step1)
  2. [通话音频播放媒体对象](#step2)
  3. [SDK 初始化设置](#step3)
  4. [SDK 方法调用](#step4)

### 1、<span id="step1">SDK脚本引入</span>
  HTML script标签直接引入， *示例如下*
  ```
     <script src="root/path/to/qiyuconnect.min.js"></script>
  ```
  或  package.json "dependencies"依赖包，*示例如下*
  ```
    { "qiyuconnect": "git+https://github.com/NSFI/7uConnect.git#v3.14-hk" }
  ```

### 2、<span id="step2">通话音频播放媒体对象</span>
HTML文档中添加媒体元素,元素不可见。通话音频流播放需要对应SIP适配器初始化配置媒体播放选择器 `media_selectorId` *示例如下*
```
  <video id="qiyuPhone" autoplay="" style="position:absolute;z-index: -1!important;opacity:0"></video>
```

### 3、<span id="step3">SDK初始化设置</span>
  SIP通讯必须明确企业标志appId, 注册服务器的sip账号及密码, 以及播放通话的媒体对象。 用户需在HTTPS安全协议且允许访问麦克风的情况下，才能正常接收发音频信息，不满足条件则无法注册服务器初始化失败。所以可选择性配置是否重复询问获取麦克风权限，配置通过白名单形式将企业域名进行部分隔离。*示例如下*
  (* npm方式引入 QiyuAdaptor 更换成 qiyuconnect)
  ```
      var config = {
          password: callUser.password, // required
          uri: {
              account: '10000700000043', // required
              domain: '@cc.qiyukf.com' // 选填 默认 @cc.qiyukf.com
          },
          socket_nlb: 'wss://ipcc2.qytest.netease.com:8443',  // required  注册服务器  https://aws.amazon.com/cn/blogs/china/overview-of-nlb/
          appId: "8a216da854ebfcf70154f24866e4083f",  // required
          media_selectorId:  "qiyuPhone",
          meida_whitelist: [], // 选填
          corpCode: location.hostname.split('.')[0],  // 选填
      };
      QiyuAdaptor.init(config);
  ```

### 4、<span id="step4">SDK 方法调用</span>
   初始化后检测初始化结果，如果成功则可调用通话方法。
   QiyuAdaptor.status如果为否则初始化正常，可调用业务通话接口进行呼出使用方法bye挂断。

   ```
     // 外呼
     if(!QiyuAdaptor.status){
       fetch('buCalloutAPI')
     } else {
       QiyuAdaptor.getCause(); // string 初始化错误文本信息
     }

     //若通话成功可在想结束电话时调用
     QiyuAdaptor.bye();

   ```

[回顶部](#introduction)




