const ping = require ("net-ping");
const session = ping.createSession();
// const fs = require('fs');

function pingHost(host) {
  session.pingHost(host, (error, target, sent, rcvd) => {
    if (error) {
      console.log(`${target} failed:${error.toString()}`);
    } else {
      const spent = rcvd.getTime() - sent.getTime();
      console.log(`${target} ok, spent: ${spent}ms`);
    }
  })
}

// const guiconfig = 'C:/Users/tujiawei/Downloads/pgfastss/gui-config.json';
// const content = fs.readFileSync(guiconfig, 'utf8');
// const contentObj = JSON.parse(content);
["192.168.43.1","192.168.43.39","192.168.43.44"].forEach((item) => {
  pingHost(item);  
})