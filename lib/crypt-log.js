'use strict';
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const { createCipheriv, createDecipheriv } = require('crypto');

const encrypt = async (input, output, key, iv) => await pipeline(createReadStream(input), createCipheriv('aes-256-cbc', key, iv), createWriteStream(output));

const decrypt = async (input, output, key, iv) => await pipeline(createReadStream(input), createDecipheriv('aes-256-cbc', key, iv), createWriteStream(output));

module.exports = { encrypt, decrypt };
