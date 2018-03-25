var Broadlink = require("../index.js");
var logger = require("../log.js").Logger;
var http = require("http");

var blink = new Broadlink();
blink.discover(null,["b4:43:0d:70:6f:a0"]);

blink.on("deviceReady",function(dev){
    logger.debug(">>>>>>>>>>>>>>>find dev ip=" + dev.host.address +" type="+dev.type);
    // if(dev.set_power)dev.set_power(true);

    blink.discover(null,["b4:43:0d:70:6f:a0"]);
});

http.createServer(function (request, response) {

    // 发送 HTTP 头部 
    // HTTP 状态值: 200 : OK
    // 内容类型: text/plain
    response.writeHead(200, {'Content-Type': 'text/plain'});

    // 发送响应数据 "Hello World"
    response.end('Hello World\n');
}).listen(27564);