'use strict';
var path = require('path');

var bencode = require('bencode');
var P2PSpider = require('./lib');

var p2p = P2PSpider({
    nodesMaxSize: 400,
    maxConnections: 800,
    timeout: 10000
});

const { Client } = require('pg')


const client = new Client({
  user: 'torfiles',
  host: 'localhost',
  database: 'torfiles',
  password: 'asdf',
});

client.connect();

p2p.ignore(function (infohash, rinfo, callback) {

    var stmt = 'insert into torrent_peer (info_hash, peer_address) values ($1, $2)';
    var values = [infohash, rinfo.address];
    client.query(stmt, values, (err, res) => {
        if (err) {
            console.log(err.stack);
        } else {
            console.log('Saving peer: ' + values);
        }
    });

    stmt = 'select * from torrent where info_hash = $1';
    values = [infohash];
    client.query(stmt, values, (err, res) => {
        if (err) {
            console.log(err);
        } else {
            console.log(res.rows.length);
            if (res.rows.length == 0) {
                callback(false);
            }
        }
    });

});

p2p.on('metadata', function (metadata) {
    var bcode = bencode.encode({'info': metadata.info});

    console.log(bcode);
    const stmt = 'insert into torrent (info_hash, name, size_bytes, age, bencode) values ($1, $2, $3, $4, $5)';
    const values = [bcode.infohash, bcode.name, bcode.size_bytes, bcode.age, bcode];

    client.query(stmt, values, (err, res) => {
        if (err) {
            return console.log(err.stack);
        } else {
            console.log(bcode.name + " has saved.");
        }
    });

    // fs.writeFile(torrentFilePathSaveTo, bencode.encode({'info': metadata.info}), function(err) {
    //     if (err) {
    //         return console.error(err);
    //     }
    //     console.log(metadata.infohash + ".torrent has saved.");
    // });
});

p2p.listen(6881, '0.0.0.0');
