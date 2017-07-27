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
            console.log('got to err');
            console.log(err.stack);
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
    var data = bencode.decode(bcode, 'utf8').info;
    console.log(data);
    const stmt = 'insert into torrent (info_hash, name, size_bytes, bencode) values ($1, $2, $3, $4)';
    const values = [metadata.infohash, data.name, data.length, bcode];

    client.query(stmt, values, (err, res) => {
        if (err) {
            return console.log(err.stack);
        } else {
            console.log(data.name + " has saved.");
        }
    });

    for (var file in data.files) {
        console.log(file);
    }
});

p2p.listen(6881, '0.0.0.0');
