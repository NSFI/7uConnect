[TOC]
# SIP 适配器简介
  SIP 适配器是七鱼呼叫对SIP通话开源库[JsSIP](https://github.com/versatica/JsSIP)的二次开发，实现SIP通话web端的通讯能力。

## <span id="introduction">使用说明 </span>
    实现web端通话，SIP适配器的使用需满足4个基本步骤。

  1. [SDK 脚本引入](#step1)
  2. [通话音频播放媒体对象](#step2)
  3. [SDK 初始化设置](#step3)
  4. [SDK 方法调用](#step4)

### 1、<span id="step1">SDK脚本引入</span>
  方式一、HTML script标签直接引入。
  ```
     <script src="root/path/to/qiyuconnect.min.js"></script>
  ```
  方式二、package.json "dependencies"依赖包。`待上线`
  ```
    { "qiyuconnect": "git+https://github.com/NSFI/7uConnect.git#v3.14-hk" }
  ```

### 2、<span id="step2">通话音频播放媒体对象预设</span>
HTML文档中添加媒体元素,元素不可见。通话音频流播放需要对应SIP适配器初始化配置媒体播放选择器 `media_selectorId` *示例如下*
```
  <video id="qiyuPhone" autoplay="" style="position:absolute;z-index: -1!important;opacity:0"></video>
```

### 3、<span id="step3">SDK初始化设置</span>
  SIP通讯必须明确企业标志appId, 注册服务器的sip账号及密码, 以及播放通话的媒体对象。 用户需在HTTPS安全协议且允许访问麦克风的情况下，才能正常接收发音频信息，不满足条件则无法注册服务器初始化失败。可选择性配置是否重复询问获取麦克风权限，配置通过白名单形式将企业域名进行部分隔离。[全部配置项](#configuration)
  
  *示例如下 （npm方式引入将QiyuAdaptor更换成npm包名）*
  ```
      var config = {
          password: 'accountpassowrd', // required
          uri: {
            account: alice,
            domain: '@example.com',
          },
          socket_nlb: 'wss://server.example.com:443',  // required  注册服务器  https://aws.amazon.com/cn/blogs/china/overview-of-nlb/
          appId: "8a216da854ebfcf70154f24866e4083f",  // required
          media_selectorId:  "qiyuPhone",
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


#API
## <span id="configuration">全部配置项</span>
SIP适配器需要一个配置对象进行初始化，其中包括一些必填项和选填项. 
### 必设项
* [password](#password)
* [uri](#uri)
* [socket_nlb](#socket_nlb)
* [socket_lbs](#socket_lbs)
* [appId](#appId)

### 选设项
  <!-- * [pcConfig](#pcConfig) -->
  * [media_selectorId](#media_selectorId)
  * [corpCode](#corpCode)
  * [meida_whitelist](#meida_whitelist)

**<span id="password">password</span>**
SIP 认证密码 (String).

```
password: "1234"
```

**<span id="uri">uri</span>**
用户代理的SIP URI (Object). 给 SIP服务提供SIP账号地址。
Object Field
*account*  <small>URI账号</small>
*domain*  <small>URI 主域</small>
```
 uri: {
   account: "alice",
   domain: "@example.com"
 }
```

**<span id="socket_nlb">socket_nlb</span>**
SIP通讯固定长连接（websocket url）。与动态地址socket_lbs二选一。
```
socket_nlb: "wss:server.example.com:433"
```

**<span id="socket_lbs">socket_lbs</span>**  `暂不支持`
SIP通讯动态长连接（Object）。通过接口和选取规则决定最终地址。与固定地址socket_nlb二选一。

Object Field
*api*  <small>地址获取接口(Url)</small>
*localList*  <small>本地容错服务列表(Array)</small>
```
socket_lbs: {
  api: "http://gateway.example.com/api/path/to/lbs"
  localList: [
    "wss:bak1.example.com:433", 
    "wss:bak2.example.com:433"
  ]
}
```

**<span id="appId">appId</span>**
企业唯一标识（String）。
```
appId: "921576811179329"
```
**<span id="media_selectorId">media_selectorId</span>**
通话媒体流输出HTML文档对象（HTML Document Selector）。
```
media_selector: "j_sessionMediaId"
```
**<span id="corpCode">corpCode</span>**
企业域名标识（String）。
```
corpCode: "qiyu"
```
**<span id="meida_whitelist">meida_whitelist</span>**
麦克风重复检测企业白名单（Array）。由企业域名标识组成的白名单列表。
```
media_whitelist: ["qiyu", "qiyu1"]
```
  <!-- <span id="pcConfig">pcConfig</span> -->

[回顶部](#introduction)





## 适配器方法
**connect()**
 SIP代理重新打开连接，默认初始化时会自动连接。连接成功后，方可使用通话功能，失败则无法通话。
**distconnect()**
 SIP代理关闭连接，关闭连接后通话功能将无法使用。
**bye()**
 挂断当前通话中的电话。
**accept()**
 接起呼入/呼出电话进行通话。

## 适配器事件
**ringing(data)**
会话创建事件，当有来电或去电时会触发

data  (object)
 *type*  电话类型 [QiyuAdaptor.C.sessionType](#sessionTypeC)，可根据业务需求对不同类型做响应的处理。 如：呼出或监听时直接接听，其他类型弹屏。
 ```
   QiyuAdaptor.on('ringing', function(data){
     switch(data.type){
       case Adaptor.C.sessionType.CALLOUT:
          QiyuAdaptor.accept();
        break;
       case Adaptor.C.sessionType.CALLIN:
          renderRingingUI();
        break;
       default: 
          normalHandler();
        break; 
     } 
   });


  function renderRingingUI(){
    // some code ...
  }

  function normalHandler() {
    // some code ....
  };

 ```



## 适配器常量信息
适配器常量属性C的对照表.

**<span id="sessionTypeC">sessionType</span>**  电话类型(number)
|  类型  |  字段名   |   字段值   |
| ---- | ---- | ---- |
|  呼入   |  CALLIN   |   1   |
|  呼出   |   CALLOUT   |   2   |
|  监听   |  LISTENER    |   3   |
|  转接   |  TRANSFER    |   4   |
|  预测式外呼   |  FORECAST    |   5   |
|  会议邀请   |   CONFERENCE    |   6   |
