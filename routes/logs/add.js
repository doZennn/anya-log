'use strict';

const { customAlphabet, nanoid } = require('nanoid');
const { basename, resolve, join: joinPath } = require('path');
const { promises: fs, createWriteStream } = require('fs');
const tar = require('tar');
const { pipeline } = require('stream/promises');
const { randomBytes } = require('crypto');

const hashKey = require('../../lib/hash-key');
const { encrypt } = require('../../lib/crypt-log');


async function saveRequestFiles(req, reply, options) {
  const requestFiles = [];
  const tmpdir = options.tmpdir;
  await fs.mkdir(tmpdir);

  const files = await req.files(options);
  for await (const file of files) {
    if (!file.filename) {
      return reply.code(400).send(new Error('File does not have a file name.'));
    }
    const filepath = joinPath(tmpdir, file.filename);
    const target = createWriteStream(filepath);
    try {
      await pipeline(file.file, target);
      requestFiles.push({ ...file, filepath });
    } catch (err) {
      req.log.error({ err }, 'save request file');
      throw err;
    }
  }

  return requestFiles;
}

module.exports = async function (fastify) {
  const generateKey = customAlphabet(fastify.config.KEY_DICTIONARY, fastify.config.KEY_LENGTH);

  fastify.register(require('@fastify/multipart'));
  // Rate limit log uploads
  fastify.register(require('@fastify/rate-limit'), {
    max: fastify.config.MAX_LOGS_MINUTE,
    timeWindow: '1 minute'
  });

  fastify.post('/', async function (req, reply) {
    const workingDir = resolve('tmp', nanoid());
    const options = {
      tmpdir: workingDir,
      limits: {
        fieldNameSize: 100, // Max field name size in bytes
        fieldSize: 100, // Max field value size in bytes
        fields: 0, // Don't allow non-files
        fileSize: fastify.config.MAX_FILES_SIZE, // Max total size
        files: fastify.config.MAX_FILES, // Max number of log files
        headerPairs: 2000 // Max number of header key=>value pairs
      }
    };

    try {
      const files = await saveRequestFiles(req, reply, options);
      if (files.length === 0) {
        return reply.code(400).send(new Error('Upload at least one log file.'));
      }

      const logKey = generateKey();
      const delKey = generateKey(6);
      const expireTime = new Date(new Date().getTime() + (fastify.config.LOG_EXPIRE_TIME * 1000));

      const hashedKey1 = await hashKey(logKey);
      const hashedKey2 = await hashKey(hashedKey1);

      const outputPath = resolve(
        'public',
        'log',
        hashedKey2.substring(0, 2),
        hashedKey2.substring(2, 4)
      );
      const outputArchive = joinPath(workingDir, 'output.tgz');
      const outputArchiveEncrypted = joinPath(outputPath, `${hashedKey2}.tar.gz`);

      await fs.mkdir(outputPath, { recursive: true });
      tar.c({
        sync: true,
        portable: true,
        preservePaths: false,
        noDirRecurse: true,
        gzip: {
          level: 9,
        },
        follow: true,
        cwd: workingDir,
        file: outputArchive
      }, files.map((f) => basename(f.filepath)));

      const iv = randomBytes(16);

      // Encrypt file with first hash
      await encrypt(outputArchive, outputArchiveEncrypted, Buffer.from(hashedKey1, 'hex'), iv);

      // Store file with secondd hash
      const sqlTime = expireTime.toISOString().slice(0, 19).replace('T', ' ');
      await fastify.db.prepare(`
        INSERT INTO logs
          (id, delkey, iv, expires)
        VALUES
          (?, ?, ?, ?)
      `).run(hashedKey2, delKey, iv.toString('hex'), sqlTime);

      await fs.rm(workingDir, { recursive: true, force: true });

      return reply.send({
        key: logKey,
        delete_key: `${logKey}:${delKey}`,
        expires: Math.floor(new Date(expireTime).getTime() / 1000)
      });
    } catch (error) {
      if (error instanceof fastify.multipartErrors.RequestFileTooLargeError) {
        return reply.code(413).send(new Error(`Total log size exceeds ${fastify.config.MAX_SIZE_LOGS} bytes.`));
      } else if (error instanceof fastify.multipartErrors.FieldsLimitError) {
        return reply.code(422).send(new Error('Do not send non-file multipart fields.'));
      } else if (error instanceof fastify.multipartErrors.FilesLimitError) {
        return reply.code(400).send(new Error('Maximum files exceeded.'));
      }
      fastify.log.error(error);
      throw new Error('An unknown error occurred while saving logs.');
    }
  });
};
