const parseKeys = require('parse-asn1');
const createHash = require('create-hash');
const bn = require('bn.js');
const crt = require('browserify-rsa');
const getRandomValues= require('polyfill-crypto.getrandomvalues');
const Buffer = require('safe-buffer').Buffer;
const crypto = global.crypto || global.msCrypto;

function randomBytes(size, cb) {
    // phantomjs needs to throw
    if (size > 65536) throw new Error('requested too many random bytes')
    // in case browserify  isn't using the Uint8Array version
    var rawBytes = new global.Uint8Array(size)

    // This will not work in older browsers.
    // See https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
    if (size > 0) {  // getRandomValues fails on IE if size == 0
        if (crypto && crypto.getRandomValues) {
            crypto.getRandomValues(rawBytes)
        } else {
            getRandomValues(rawBytes);
        }
    }

    // XXX: phantomjs doesn't like a buffer being passed here
    var bytes = Buffer.from(rawBytes.buffer)

    if (typeof cb === 'function') {
        return process.nextTick(function () {
            cb(null, bytes)
        })
    }

    return bytes
}

function withPublic(paddedMsg, key) {
    return new Buffer(paddedMsg
        .toRed(bn.mont(key.modulus))
        .redPow(new bn(key.publicExponent))
        .fromRed()
        .toArray());
}

function mgf(seed, len) {
    var t = new Buffer('');
    var i = 0, c;
    while (t.length < len) {
        c = i2ops(i++);
        t = Buffer.concat([t, createHash('sha1').update(seed).update(c).digest()]);
    }
    return t.slice(0, len);
}

function i2ops(c) {
    var out = new Buffer(4);
    out.writeUInt32BE(c, 0);
    return out;
}

function xor(a, b) {
    var len = a.length;
    var i = -1;
    while (++i < len) {
        a[i] ^= b[i];
    }
    return a
}


function oaep(key, msg) {
    var k = key.modulus.byteLength();
    var mLen = msg.length;
    var iHash = createHash('sha1').update(new Buffer('')).digest();
    var hLen = iHash.length;
    var hLen2 = 2 * hLen;
    if (mLen > k - hLen2 - 2) {
        throw new Error('message too long');
    }
    var ps = new Buffer(k - mLen - hLen2 - 2);
    ps.fill(0);
    var dblen = k - hLen - 1;
    var seed = randomBytes(hLen);
    var maskedDb = xor(Buffer.concat([iHash, ps, new Buffer([1]), msg], dblen), mgf(seed, dblen));
    var maskedSeed = xor(seed, mgf(maskedDb, hLen));
    return new bn(Buffer.concat([new Buffer([0]), maskedSeed, maskedDb], k));
}
function pkcs1(key, msg, reverse) {
    var mLen = msg.length;
    var k = key.modulus.byteLength();
    if (mLen > k - 11) {
        throw new Error('message too long');
    }
    var ps;
    if (reverse) {
        ps = new Buffer(k - mLen - 3);
        ps.fill(0xff);
    } else {
        ps = nonZero(k - mLen - 3);
    }
    return new bn(Buffer.concat([new Buffer([0, reverse ? 1 : 2]), ps, new Buffer([0]), msg], k));
}
function nonZero(len, crypto) {
    var out = new Buffer(len);
    var i = 0;
    var cache = randomBytes(len * 2);
    var cur = 0;
    var num;
    while (i < len) {
        if (cur === cache.length) {
            cache = randomBytes(len * 2);
            cur = 0;
        }
        num = cache[cur++];
        if (num) {
            out[i++] = num;
        }
    }
    return out;
}

module.exports = (public_key, msg, reverse) => {
    var padding;
    if (public_key.padding) {
        padding = public_key.padding;
    } else if (reverse) {
        padding = 1;
    } else {
        padding = 4;
    }
    var key = parseKeys(public_key);
    var paddedMsg;
    if (padding === 4) {
        paddedMsg = oaep(key, msg);
    } else if (padding === 1) {
        paddedMsg = pkcs1(key, msg, reverse);
    } else if (padding === 3) {
        paddedMsg = new bn(msg);
        if (paddedMsg.cmp(key.modulus) >= 0) {
            throw new Error('data too long for modulus');
        }
    } else {
        throw new Error('unknown padding');
    }
    if (reverse) {
        return crt(paddedMsg, key);
    } else {
        return withPublic(paddedMsg, key);
    }
};

