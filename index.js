var logger = require("./log.js").Logger;
var util = require('util');
// var ping = require ("net-ping");
let EventEmitter = require('events');
let dgram = require('dgram');
let os = require('os');
let crypto = require('crypto');

// RM Devices (without RF support)
const rmDeviceTypes = {};
rmDeviceTypes[parseInt(0x2737, 16)] = 'Broadlink RM Mini';
rmDeviceTypes[parseInt(0x273d, 16)] = 'Broadlink RM Pro Phicomm';
rmDeviceTypes[parseInt(0x2712, 16)] = 'Broadlink RM2';
rmDeviceTypes[parseInt(0x2783, 16)] = 'Broadlink RM2 Home Plus';
rmDeviceTypes[parseInt(0x277c, 16)] = 'Broadlink RM2 Home Plus GDT';
rmDeviceTypes[parseInt(0x278f, 16)] = 'Broadlink RM Mini Shate';

// RM Devices (with RF support)
const rmPlusDeviceTypes = {};
rmPlusDeviceTypes[parseInt(0x272a, 16)] = 'Broadlink RM2 Pro Plus';
rmPlusDeviceTypes[parseInt(0x2787, 16)] = 'Broadlink RM2 Pro Plus v2';
rmPlusDeviceTypes[parseInt(0x278b, 16)] = 'Broadlink RM2 Pro Plus BL';
rmPlusDeviceTypes[parseInt(0x279d, 16)] = 'Broadlink RM3 Pro Plus';
rmPlusDeviceTypes[parseInt(0x27a9, 16)] = 'Broadlink RM3 Pro Plus v2'; // (model RM 3422)


var Broadlink = module.exports = function() {
    EventEmitter.call(this);
    this.devices = {};
    this.sendIP = "255.255.255.255";
}
util.inherits(Broadlink, EventEmitter);


Broadlink.prototype.genDevice = function(devtype, host, mac) {
    var dev = new device(host, mac,devtype);
    if (devtype == 0) { // SP1
        dev.sp1();
    } else if (devtype == 0x2711) { // SP2
        dev.sp2();
    } else if (devtype == 0x2719 || devtype == 0x7919 || devtype == 0x271a || devtype == 0x791a) { // Honeywell SP2
        dev.sp2();
    } else if (devtype == 0x2720) { // SPMini
        dev.sp2();
    } else if (devtype == 0x753e) { // SP3
        dev.sp2();
    } else if (devtype == 0x2728) { // SPMini2
        dev.sp2();
    } else if (devtype == 0x2733 || devtype == 0x273e) { // OEM branded SPMini Contros
        dev.sp2();
    } else if (devtype >= 0x7530 && devtype <= 0x7918) { // OEM branded SPMini2
        dev.sp2();
    } else if (devtype == 0x2736) { // SPMiniPlus
        dev.sp2();
    }else if (devtype == 0x2712) { // RM2
        dev.rm();
    } else if (devtype == 0x2737) { // RM Mini
        dev.rm();
    } else if (devtype == 0x273d) { // RM Pro Phicomm
        dev.rm();
    } else if (devtype == 0x2783) { // RM2 Home Plus
        dev.rm();
    } else if (devtype == 0x277c) { // RM2 Home Plus GDT
        dev.rm();
    } else if (devtype == 0x272a) { // RM2 Pro Plus
        dev.rm();
    } else if (devtype == 0x2787) { // RM2 Pro Plus2
        dev.rm();
    } else if (devtype == 0x278b) { // RM2 Pro Plus BL
        dev.rm();
    } else if (devtype == 0x278f) { // RM Mini Shate
        dev.rm();
    } else if(devtype == 0x279d){ // RM3 Pro Plus
        dev = new device(host,mac,devtype);
        dev.rm(true);
    }else if (devtype == 0x2714) { // A1
        dev.a1();
    } else if (devtype == 0x4EB5) { // MP1
        dev.mp1();
    } else if (devtype == 0x4F1B) { // MP2
        dev.mp2();
    } else {
        logger.info("unknown device found... dev_type: " + devtype.toString(16) + " @ " + host.address);
        return null;
    }
    return dev;
}

/*Broadlink.prototype.findReachable = function(local_ip_address){
    var address = this.getSelfIP(local_ip_address);
    var self = this;
    this.reachable = [];
    var address_parts = address.split('.');
    var size = 254; //except 0&255
    const session = ping.createSession();d
    for(let i = 39;i<40;i++){ 
        (function(host){

            session.pingHost(host, (error, target, sent, rcvd) => {
                if (error) {
                    // console.log(`${target} failed:${error.toString()}`);
                } else {
                    const spent = rcvd.getTime() - sent.getTime();
                    console.log(`${target} ok, spent: ${spent}ms`);
                    self.reachable.push(target);
                    self.emit("Reached",target);
                }
              })
        })(address_parts[0] +"."+ address_parts[1] +"."+ address_parts[2] +"."+i);
    }
    
}*/

Broadlink.prototype.getSelfIP = function(local_ip_address){
    var interfaces = os.networkInterfaces();
    if (local_ip_address) {
        return  local_ip_address;
    } else {
        var addresses = [];
        for (var k in interfaces) {
            for (var k2 in interfaces[k]) {
                var address = interfaces[k][k2];
                if (address.family === 'IPv4' && !address.internal) {
                    addresses.push(address.address);
                }
            }
        }
        return  addresses[0];
    }
    return undefined;
}


function buildMac(mac){
    let ret = "";
    var t = mac.toString('hex');
    t = t.split("");
    for(let i in t){
        ret += t[i] ;
        ret += (i%2==1)?":":"";
    }
    return ret.substring(0,17).toUpperCase();
}

Broadlink.prototype.discover = function(local_ip_address,targets) {
    self = this;
    var address = this.getSelfIP(local_ip_address);
    if(!address){
        throw Error("Cannot find self IP-Address");
    }
    var cs = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    cs.on('listening', function() {
        cs.setBroadcast(true);

        var port = cs.address().port;
        var now = new Date();
        var starttime = now.getTime();

        var timezone = now.getTimezoneOffset() / -3600; // 应该是处以60啊，-480/60=-8
        var packet = Buffer.alloc(0x30, 0);

        var year = now.getYear();

        if (timezone < 0) {
            packet[0x08] = 0xff + timezone - 1;
            packet[0x09] = 0xff;
            packet[0x0a] = 0xff;
            packet[0x0b] = 0xff;
        } else {
            packet[0x08] = timezone;
            packet[0x09] = 0;
            packet[0x0a] = 0;
            packet[0x0b] = 0;
        }
        packet[0x0c] = year & 0xff;
        packet[0x0d] = year >> 8;
        packet[0x0e] = now.getMinutes();
        packet[0x0f] = now.getHours();
        var subyear = year % 100;
        packet[0x10] = subyear;
        packet[0x11] = now.getDay();
        packet[0x12] = now.getDate();
        packet[0x13] = now.getMonth();
        var address_parts = address.split('.');
        packet[0x18] = parseInt(address_parts[0]);
        packet[0x19] = parseInt(address_parts[1]);
        packet[0x1a] = parseInt(address_parts[2]);
        packet[0x1b] = parseInt(address_parts[3]);
        packet[0x1c] = port & 0xff;
        packet[0x1d] = port >> 8;
        packet[0x26] = 6;
        var checksum = 0xbeaf;

        for (var i = 0; i < packet.length; i++) {
            checksum += packet[i];
        }
        checksum = checksum & 0xffff;
        packet[0x20] = checksum & 0xff;
        packet[0x21] = checksum >> 8;

        for(let index in targets){ // 多个地址
            let target = targets[index];// ip或者mac
            let targetIP = target;
            if(!target)continue;
            if(target && target.length == 17){ // mac 地址
                var dev = self.devices[target.toUpperCase()]; // 已经有了
                if(dev){ 
                    targetIP = dev.host.address;
                }else{// 没有，发送广播
                    targetIP = "255.255.255.255";
                }
            }
            logger.debug("[Discover]Send package to %s,target is %s",targetIP,target);
            cs.sendto(packet, 0, packet.length, 80, targetIP);
        }
        // self.on("Reached",function(target){
        //     try{
                
        //     }catch(err){
        //         logger.error("[error]Send package to %s,err is ",target,err);
        //     }
        // });
        
    });

    cs.on("message", (msg, rinfo) => {
        
        var host = rinfo;
        logger.debug("[Discover]Receive package from "+host.address);

        var mac = Buffer.alloc(6, 0);
        msg.copy(mac, 0x00, 0x3F);
        msg.copy(mac, 0x01, 0x3E);
        msg.copy(mac, 0x02, 0x3D);
        msg.copy(mac, 0x03, 0x3C);
        msg.copy(mac, 0x04, 0x3B);
        msg.copy(mac, 0x05, 0x3A);

        var devtype = msg[0x34] | msg[0x35] << 8;
        if (!this.devices) {
            this.devices = {};
        }

        mac = buildMac(mac);
        if (!this.devices[mac]) {
            var dev = this.genDevice(devtype, host, mac);
            if (dev) {
                this.devices[mac] = dev;
                dev.on("deviceReady", () => { this.emit("deviceReady", dev); });
                dev.auth();// 发送验证数据
            }
        }
    });

    cs.on('close', function() {
        console.log('===Server Closed');
    });

    cs.bind(0, address);

}

function device(host, mac,devtype, timeout = 5) {
    this.host = host;
    this.mac = mac;
    this.emitter = new EventEmitter();
    this.devtype = devtype;
    this.on = this.emitter.on;
    this.emit = this.emitter.emit;
    this.removeListener = this.emitter.removeListener;

    this.timeout = timeout;
    this.count = Math.random() & 0xffff;
    this.key = new Buffer([0x09, 0x76, 0x28, 0x34, 0x3f, 0xe9, 0x9e, 0x23, 0x76, 0x5c, 0x15, 0x13, 0xac, 0xcf, 0x8b, 0x02]);
    this.iv = new Buffer([0x56, 0x2e, 0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58]);
    this.id = new Buffer([0, 0, 0, 0]);
    this.cs = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.cs.on('listening', function() {
        //this.cs.setBroadcast(true);
    });
    this.cs.on("message", (response, rinfo) => { // 针对每个设备都会开启一个udp服务器，auth()后会返回
        logger.debug("[Device]Received message from %s !",rinfo.address);
        var enc_payload = Buffer.alloc(response.length - 0x38, 0);
        response.copy(enc_payload, 0, 0x38);

        var decipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv);
        decipher.setAutoPadding(false);
        var payload = decipher.update(enc_payload);
        var p2 = decipher.final();
        if (p2) {
            payload = Buffer.concat([payload, p2]);
        }

        if (!payload) {
            return false;
        }

        var command = response[0x26];
        var err = response[0x22] | (response[0x23] << 8);

        if (err != 0) return;

        if (command == 0xe9) { // 设置auth()成功后的返回,执行设备的deviceReady，设备再执行broadlink的deviceReady
            this.key = Buffer.alloc(0x10, 0);
            payload.copy(this.key, 0, 0x04, 0x14);

            this.id = Buffer.alloc(0x04, 0);
            payload.copy(this.id, 0, 0x00, 0x04);
            this.emit("deviceReady");
        } else if (command == 0xee) {
            this.emit("payload", err, payload);
        }

    });
    this.cs.bind();
    this.type = "Unknown";

}

device.prototype.auth = function() { // 向设备发送auth数据
    var payload = Buffer.alloc(0x50, 0);
    payload[0x04] = 0x31;
    payload[0x05] = 0x31;
    payload[0x06] = 0x31;
    payload[0x07] = 0x31;
    payload[0x08] = 0x31;
    payload[0x09] = 0x31;
    payload[0x0a] = 0x31;
    payload[0x0b] = 0x31;
    payload[0x0c] = 0x31;
    payload[0x0d] = 0x31;
    payload[0x0e] = 0x31;
    payload[0x0f] = 0x31;
    payload[0x10] = 0x31;
    payload[0x11] = 0x31;
    payload[0x12] = 0x31;
    payload[0x1e] = 0x01;
    payload[0x2d] = 0x01;
    payload[0x30] = 'T'.charCodeAt(0);
    payload[0x31] = 'e'.charCodeAt(0);
    payload[0x32] = 's'.charCodeAt(0);
    payload[0x33] = 't'.charCodeAt(0);
    payload[0x34] = ' '.charCodeAt(0);
    payload[0x35] = ' '.charCodeAt(0);
    payload[0x36] = '1'.charCodeAt(0);

    this.sendPacket(0x65, payload);

}

device.prototype.exit = function() {
    var self = this;
    setTimeout(function() {
        self.cs.close();
    }, 500);
}

device.prototype.getType = function() {
    return this.type;
}

device.prototype.sendPacket = function(command, payload) {
    this.count = (this.count + 1) & 0xffff;
    var packet = Buffer.alloc(0x38, 0);
    packet[0x00] = 0x5a;
    packet[0x01] = 0xa5;
    packet[0x02] = 0xaa;
    packet[0x03] = 0x55;
    packet[0x04] = 0x5a;
    packet[0x05] = 0xa5;
    packet[0x06] = 0xaa;
    packet[0x07] = 0x55;
    packet[0x24] = 0x2a;
    packet[0x25] = 0x27;
    packet[0x26] = command;
    packet[0x28] = this.count & 0xff;
    packet[0x29] = this.count >> 8;
    packet[0x2a] = this.mac[0];
    packet[0x2b] = this.mac[1];
    packet[0x2c] = this.mac[2];
    packet[0x2d] = this.mac[3];
    packet[0x2e] = this.mac[4];
    packet[0x2f] = this.mac[5];
    packet[0x30] = this.id[0];
    packet[0x31] = this.id[1];
    packet[0x32] = this.id[2];
    packet[0x33] = this.id[3];

    var checksum = 0xbeaf;
    for (var i = 0; i < payload.length; i++) {
        checksum += payload[i];
        checksum = checksum & 0xffff;
    }

    var cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
    payload = cipher.update(payload);
    var p2 = cipher.final();

    packet[0x34] = checksum & 0xff;
    packet[0x35] = checksum >> 8;

    packet = Buffer.concat([packet, payload]);

    checksum = 0xbeaf;
    for (var i = 0; i < packet.length; i++) {
        checksum += packet[i];
        checksum = checksum & 0xffff;
    }
    packet[0x20] = checksum & 0xff;
    packet[0x21] = checksum >> 8;
    //console.log("dev send packet to " + this.host.address + ":" + this.host.port);
    this.cs.sendto(packet, 0, packet.length, this.host.port, this.host.address);
}

device.prototype.mp1 = function() {
    this.type = "MP1";

    this.set_power = function(sid, state) {
        //"""Sets the power state of the smart power strip."""
        var sid_mask = 0x01 << (sid - 1);
        var packet = Buffer.alloc(16, 0);
        packet[0x00] = 0x0d;
        packet[0x02] = 0xa5;
        packet[0x03] = 0xa5;
        packet[0x04] = 0x5a;
        packet[0x05] = 0x5a;
        packet[0x06] = 0xb2 + (state ? (sid_mask << 1) : sid_mask);
        packet[0x07] = 0xc0;
        packet[0x08] = 0x02;
        packet[0x0a] = 0x03;
        packet[0x0d] = sid_mask;
        packet[0x0e] = state ? sid_mask : 0;

        this.sendPacket(0x6a, packet);
    }

    this.check_power = function() {
        //"""Returns the power state of the smart power strip in raw format."""
        var packet = Buffer.alloc(16, 0);
        packet[0x00] = 0x0a;
        packet[0x02] = 0xa5;
        packet[0x03] = 0xa5;
        packet[0x04] = 0x5a;
        packet[0x05] = 0x5a;
        packet[0x06] = 0xae;
        packet[0x07] = 0xc0;
        packet[0x08] = 0x01;

        this.sendPacket(0x6a, packet);
    }

    this.on("payload", (err, payload) => {
        logger.debug("mp1 payload..");
        var param = payload[0];
        switch (param) {
            case 1:
                console.log("case 1 -");
                break;
            case 2:
                console.log("case 2 -");
                break;
            case 3:
                console.log("case 3 -");
                break;
            case 4:
                console.log("case 4 -");
                break;
            case 14:
                var s1 = Boolean(payload[0x0e] & 0x01);
                var s2 = Boolean(payload[0x0e] & 0x02);
                var s3 = Boolean(payload[0x0e] & 0x04);
                var s4 = Boolean(payload[0x0e] & 0x08);
                this.emit("mp_power", [s1, s2, s3, s4]);
                break;
            default:
                console.log("case default - " + param);
                break;
        }
    });
}

device.prototype.mp2 = function() {
    this.type = "MP2";

    this.set_power = function(sid, state) {
        //"""Sets the power state of the smart power strip."""
        var sid_mask = 0x01 << (sid - 1);
        var packet = Buffer.alloc(16, 0);
        packet[0x00] = 0x0d;
        packet[0x02] = 0xa5;
        packet[0x03] = 0xa5;
        packet[0x04] = 0x5a;
        packet[0x05] = 0x5a;
        packet[0x06] = 0xb2 + (state ? (sid_mask << 1) : sid_mask);
        packet[0x07] = 0xc0;
        packet[0x08] = 0x02;
        packet[0x0a] = 0x03;
        packet[0x0d] = sid_mask;
        packet[0x0e] = state ? sid_mask : 0;

        this.sendPacket(0x6a, packet);
    }

    this.check_power = function() {
        //"""Returns the power state of the smart power strip in raw format."""
        var packet = Buffer.alloc(16, 0);
        packet[0x00] = 0x0a;
        packet[0x02] = 0xa5;
        packet[0x03] = 0xa5;
        packet[0x04] = 0x5a;
        packet[0x05] = 0x5a;
        packet[0x06] = 0xae;
        packet[0x07] = 0xc0;
        packet[0x08] = 0x01;

        this.sendPacket(0x6a, packet);
    }

    this.on("payload", (err, payload) => {
        logger.debug("mp2 payload..");
        var param = payload[0];
        switch (param) {
            case 1:
                console.log("case 1 -");
                break;
            case 2:
                console.log("case 2 -");
                break;
            case 3:
                console.log("case 3 -");
                break;
            case 4:
                console.log("case 4 -");
                break;
            case 0x1b:
                var s1 = Boolean(payload[0x0e] & 0x01);
                var s2 = Boolean(payload[0x0e] & 0x02);
                var s3 = Boolean(payload[0x0e] & 0x04);
                var s4 = Boolean(payload[0x0e] & 0x08);
                this.emit("mp_power", [s1, s2, s3, s4]);
                break;
            default:
                console.log("case default - " + param);
                break;
        }
    });
}

device.prototype.sp1 = function() {
    this.type = "SP1";
    this.set_power = function(state) {
        var packet = Buffer.alloc(4, 4);
        packet[0] = state;
        this.sendPacket(0x66, packet);
    }
}



device.prototype.sp2 = function() {
    var self = this;
    this.type = "SP2";
    this.set_power = function(state) {
        //"""Sets the power state of the smart plug."""
        var packet = Buffer.alloc(16, 0);
        packet[0] = 2;
        packet[4] = state ? 1 : 0;
        this.sendPacket(0x6a, packet);

    }

    this.check_power = function() {
        //"""Returns the power state of the smart plug."""
        var packet = Buffer.alloc(16, 0);
        packet[0] = 1;
        this.sendPacket(0x6a, packet);

    }

    this.on("payload", (err, payload) => {
        logger.debug("sp2 payload..");
        var param = payload[0];
        switch (param) {
            case 1: //get from check_power
                var pwr = Boolean(payload[0x4]);
                this.emit("power", pwr);
                break;
            case 3:
                console.log('case 3');
                break;
            case 4:
                console.log('case 4');
                break;
        }

    });


}

device.prototype.a1 = function() {
    this.type = "A1";
    this.check_sensors = function() {
        this.getRaw = false;
        var packet = Buffer.alloc(16, 0);
        packet[0] = 1;
        this.sendPacket(0x6a, packet);
    }

    this.check_sensors_raw = function() {
        this.getRaw = true;
        var packet = Buffer.alloc(16, 0);
        packet[0] = 1;
        this.sendPacket(0x6a, packet);
    }
    
    this.on("payload", (err, payload) => {
        logger.debug("a1 payload..");
       
        var err = payload[0x22] | (payload[0x23] << 8)
        if(err != 0){
            this.emit("A1Error",err);
            return;
        }
        var type = payload[0x4];
        this.data = {};
        this.data['temperature'] = (payload[0x4] * 10 + payload[0x5]) / 10.0
        this.data['humidity'] = (payload[0x6] * 10 + payload[0x7]) / 10.0
        let light = payload[0x8]
        let air_quality = payload[0x0a]
        let noise = payload[0xc]
        if(this.getRaw){
            this.data['light'] = light;
            this.data['airQuality'] = air_quality;
            this.data['noise'] = noise;
            this.emit("A1Get",this.data);
            return;
        }
        if(light == 0){
            this.data['light'] = 'dark';
        }else if(light == 1){
            this.data['light'] = 'dim';
        }else if(light == 2){
            this.data['light'] = 'normal';
        }else if(light == 3){
            this.data['light'] = 'bright';
        }else{
            this.data['light'] = 'unknown';
        }

        if(air_quality == 0){
            this.data['airQuality'] = 'excellent';
        }else if(air_quality == 1){
            this.data['airQuality'] = 'good';
        }else if(air_quality == 2){
            this.data['airQuality'] = 'normal';
        }else if(air_quality == 3){
            this.data['airQuality'] = 'bad';
        }else{
            this.data['airQuality'] = 'unknown';
        }

        if(noise == 0){
            this.data['noise'] = 'quiet';
        }else if(noise == 1){
            this.data['noise'] = 'normal';
        }else if(noise == 2){
            this.data['noise'] = 'noisy';
        }else{
            this.data['noise'] = 'unknown';
        }
        this.emit("A1Get",this.data);
    });
}


device.prototype.rm = function() {
    this.type = "RM2";
    this.checkData = function() {
        var packet = Buffer.alloc(16, 0);
        packet[0] = 4;
        this.sendPacket(0x6a, packet);
    }

    this.sendData = function(data) {
        packet = new Buffer([0x02, 0x00, 0x00, 0x00]);
        packet = Buffer.concat([packet, data]);
        this.sendPacket(0x6a, packet);
    }
    this.cancelLearn = function() {
        packet = Buffer.alloc(16, 0);
        packet[0] = 0x1e;
        this.sendPacket(0x6a, packet);
    }
    this.enterLearning = function() {
        var packet = Buffer.alloc(16, 0);
        packet[0] = 3;
        this.sendPacket(0x6a, packet);
    }

    this.checkTemperature = function() {
        var packet = Buffer.alloc(16, 0);
        packet[0] = 1;
        this.sendPacket(0x6a, packet);
    }

    if(rmPlusDeviceTypes[parseInt(this.devtype, 16)]) {
        this.supportRF = true;
        this.enterRFSweep = () => {
          const packet = Buffer.alloc(16, 0);
          packet[0] = 0x19;
          this.sendPacket(0x6a, packet);
        }
    
        this.checkRFData = () => {
          const packet = Buffer.alloc(16, 0);
          packet[0] = 0x1a;
          this.sendPacket(0x6a, packet);
        }
    
        this.checkRFData2 = () => {
          const packet = Buffer.alloc(16, 0);
          packet[0] = 0x1b;
          this.sendPacket(0x6a, packet);
        }
    }

    this.on("payload", (err, payload) => {
        var param = payload[0];
        switch (param) {
            case 1:
                var temp = (payload[0x4] * 10 + payload[0x5]) / 10.0;
                this.emit("temperature", temp);
                break;
            case 4: //get from check_data
                var data = Buffer.alloc(payload.length - 4, 0);
                payload.copy(data, 0, 4);
                this.emit("rawData", data);
                break;
            case 26://get from check_data
                var data = Buffer.alloc(1, 0);
                payload.copy(data, 0, 0x4);
                if (data[0] !== 0x1) break;
                this.emit('rawRFData', data);
                break;
            case 27://get from check_data
                var data = Buffer.alloc(1, 0);
                payload.copy(data, 0, 0x4);
                if (data[0] !== 0x1) break;
                this.emit('rawRFData2', data);
                break;
        }
    });
}
