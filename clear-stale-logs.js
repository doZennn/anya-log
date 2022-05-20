'use strict';

const { resolve, join } = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// https://gist.github.com/jakub-g/5903dc7e4028133704a4
function cleanEmptyFoldersRecursively(folder) {
  var isDir = fs.statSync(folder).isDirectory();
  if (!isDir) {
    return;
  }
  var files = fs.readdirSync(folder);
  if (files.length > 0) {
    files.forEach(function(file) {
      var fullPath = join(folder, file);
      cleanEmptyFoldersRecursively(fullPath);
    });

    // re-evaluate files; after deleting subfolder
    // we may have parent folder empty now
    files = fs.readdirSync(folder);
  }

  if (files.length == 0) {
    fs.rmdirSync(folder);
    return;
  }
}

const getLogDir = (id) => resolve(
  'public',
  'log',
  id.substring(0, 2),
  id.substring(2, 4)
);

const db = new Database('anyalog.db', { fileMustExist: true });

// Delete logs past expire time
const logs = db.prepare('SELECT id FROM logs WHERE expires <= DATETIME()').all();
const logIds = logs.flatMap((x) => x.id);
logIds.forEach((logId) => {
  const path = getLogDir(logId);
  fs.rmSync(join(path, `${logId}.tar.gz`), { recursive: true, force: true });
});

db.prepare('DELETE FROM logs WHERE expires <= DATETIME()').run();

// Clean up log dir
cleanEmptyFoldersRecursively(resolve('public', 'log'));
db.close();
