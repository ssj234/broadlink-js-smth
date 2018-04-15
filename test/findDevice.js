var Broadlink = require("../index.js");
var logger = require("../log.js").Logger;
var http = require("http");

var blink = new Broadlink();
blink.discover(null,["b4:43:0d:70:6f:a0"]);

blink.on("deviceReady",function(dev){
    console.log("typeof mac >>> "+typeof dev.mac);
    logger.debug(">>>>>>>>>>>>>>>find dev ip=" + dev.host.address +" type="+dev.type);
    // if(dev.set_power)dev.set_power(true);
    if(dev.type == 'RM2'){
        
        // dev.on("rawData",(data) =>{
        //     console.log("hex:"+data.toString('hex'));
        // });

        // dev.enterLearning();
        // logger.debug("enterLearning()");
        // setInterval(() => {
        //     dev.checkData();
        //     // dev.enterLearning();
        // }, 1000)
    }
    if(dev.host.address == '192.168.0.127'){
        console.log(">>>>>>>>>>>>>>>>>");
        dev.set_power(false);
    }

    blink.discover(null,[]);
});

http.createServer(function (request, response) {

    // 发送 HTTP 头部 
    // HTTP 状态值: 200 : OK
    // 内容类型: text/plain
    response.writeHead(200, {'Content-Type': 'text/plain'});

    // 发送响应数据 "Hello World"
    response.end('Hello World\n');
}).listen(27564);