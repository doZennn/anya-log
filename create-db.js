'use strict';

const Database = require('better-sqlite3');

const db = new Database('anyalog.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS "logs" (
    "id" CHAR(64) NOT NULL,
    "delkey" VARCHAR(50) NOT NULL,
    "expires" DATETIME NOT NULL,
    "iv" CHAR(64) NOT NULL,
    "deleted" TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY ("id")
  );
`).run();
db.close();
