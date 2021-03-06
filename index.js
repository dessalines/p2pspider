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
            // console.log(err.stack);
        } else {
            // console.log('Saving peer: ' + values);
        }
    });

    stmt = 'select * from torrent where info_hash = $1';
    values = [infohash];
    client.query(stmt, values, (err, res) => {
        if (err) {
            console.log(err.stack);
        } else {
            if (res.rows.length == 0) {
                callback(false);
                //console.log('info_hash ' + infohash + ' already exists.');
            }
        }
    });

});

p2p.on('metadata', function (metadata) {
    var bcode = bencode.encode({'info': metadata.info});
    var data = bencode.decode(bcode, 'utf8').info;

    var bytes = (data.files) ? data.files.reduce((a, b) => a + b['length'], 0) : data['length'];
    const stmt = 'insert into torrent (info_hash, name, size_bytes, bencode) values ($1, $2, $3, $4)';
    const values = [metadata.infohash, data.name, bytes, bcode];

    client.query(stmt, values, (err, res) => {
        if (err) {
            return console.log(err.stack);
        } else {
            console.log(data.name + " has saved.");
        }
    });

    // if its a multi-file torrent
    if (data.files) {
        for (var i = 0; i < data.files.length; i++) {
            var file = data.files[i];
            var filepath = data.name + '/' + file.path.join("/");

            const stmt2 = 'insert into file (info_hash, path, size_bytes, index_) values ($1, $2, $3, $4)';
            const values2 = [metadata.infohash, filepath, file['length'], i];

            client.query(stmt2, values2, (err, res) => {
                if (err) {
                    return console.log(err.stack);
                } else {
                    // console.log(values2[1] + " file has saved.");
                }
            });
        }
    } else {
        const stmt2 = 'insert into file (info_hash, path, size_bytes, index_) values ($1, $2, $3, $4)';
        const values2 = [metadata.infohash, data.name, bytes, 0];

        client.query(stmt2, values2, (err, res) => {
            if (err) {
                return console.log(err.stack);
            } else {
                // console.log(data.name + " file has saved.");
            }
        });
    }

});

p2p.listen(6881, '0.0.0.0');
