<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/public/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="/public/hero-light.png">
  <img alt="AnyaLog Hero" src="/public/hero-dark.png">
</picture>

# AnyaLog
Simple and secure key based log upload and retrieval.

AnyaLog is designed to keep user logs as secure as possible. You cannot view the uploaded logs without the key that is sent to the user upon upload. Even with access to the database and stored files. To ensure this, make sure you aren't storing the key on accident (POST request logging, for example).

## Config
Configuration is done via environment variables. You can also place an .env in the root and it will be read.

| Key               | Description                                                                                    | Default                      |
| ----------------- | ---------------------------------------------------------------------------------------------- | ---------------------------- |
| HASH_SALT         | HEX encoded salt, 512 bytes long.                                                              |                              |
| PORT              | Port for web server to run on                                                                  | 3000                         |
| APP_NAME          | Name of the website front-end.                                                                 | AnyaLog                      |
| KEY_LENGTH        | Length of key generated for user. Longer is more secure but may be harder for the user to use. | 4                            |
| KEY_DICTIONARY    | Characters used to generate key. Must not contain ":".                                         | 346789ABCDEFGHJKLMNPQRTUVWXY |
| LOG_EXPIRE_TIME   | Time in seconds for when log files should automatically be deleted.                            | 600                          |
| MAX_FILES         | Maximum individual files per log.                                                              | 20                           |
| MAX_FILES_SIZE    | Max total log size in bytes.                                                                   | 5000000                      |
| BASE_COLOR        | Change main color. Comma separated Hue and Sat.                                                | 356, 70%                     |


## Setup
```
yarn install
yarn run create-db
```

### Serve static files
##### Via web server (recommended)
```
server {
	listen		127.0.0.1:80;
	server_name	anyalog.test;
	
	root		"/var/www/anyalog/public";

	allow		127.0.0.1;
	deny		all;
	autoindex	off;

	rewrite "^/log/([\da-f]{2})([\da-f]{2})([\da-f]{60})(.*)?$" /log/$1/$2/$1$2$3$4 last;

	location / {
		try_files $uri @anyalogproxy;
	}
	location ~* \.(tar.gz)$ {
		add_header Access-Control-Allow-Origin *;
		add_header Content-Type application/octet-stream;
	}

	location @anyalogproxy {
		proxy_http_version 1.1;
		proxy_cache_bypass $http_upgrade;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection 'upgrade';
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		proxy_pass http://127.0.0.1:3000;
	}
}
```

##### Via node process (if you absolutely have to)  
Set this env variable:
```
ANYALOG_SERVE_STATIC_FILES=true
```

### Set up delete job
Run `yarn run clear-logs` every minute to clear expired logs.  
##### Crontab:
```
* * * * * yarn --cwd=/path/to/anya-log run clear-logs
```

##### Via node (again, only if you really need to):
```
ANYALOG_USE_BUILTIN_CRON=true
```

### Start!
```
yarn run start
```

## API Usage

To upload logs, POST files to `/logs` with a multipart/form-data body. All files must have a file name.  
Log files will appear in the order you made the formdata request.

A successful response will look like this:
```json
{
  "key": "YCFOAES",
  "delete_key": "YCFOAES:A1B2C3",
  "expires": 1653873548
}
```

#### Examples
##### cURL:
```sh
curl https://anyalog.test/logs \
  -F '=@/just/a/logfile/stderr.log' \
  -F '=@/cool/jayson/asdf.json' \
  -F '=@/path/to/binaryfile.vdf'
```

##### Node.js:
```js
const someFile = fs.readFileSync('shortcuts.vdf');
const someFile2 = fs.readFileSync('stderr.log');
const someString = "Some log as a string";

const fd = new FormData();
fd.append('files[]', someFile, 'shortcuts.vdf');
fd.append('files[]', someFile2, 'stderr.log');
fd.append('asdf', new Blob([someString]), "rawstring.txt");

fetch('https://anyalog.test/logs', {
  method: 'POST',
  body: fd
}).then((res) => {
  res.json().then((data) => console.info(data));
}).catch((err) => {
  console.log(err);
});
```
