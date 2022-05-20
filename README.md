# AnyaLog
Simple and secure key based log upload and retrieval.

AnyaLog is designed to keep user logs as secure as possible. You cannot view uploaded logs without the key that is sent to the user upon upload.  
Ensure you aren't storing the key on accident (POST request logging, for example).

### Config
Configuration is done via an .env file placed in the project root.  

| Key               | Description                                                                                    | Default    |
| ----------------- | ---------------------------------------------------------------------------------------------- | ---------- |
| HASH_SALT         | HEX encoded salt, 512 bytes long.                                                              |            |
| PORT              | Port for web server to run on                                                                  | 3000       |
| APP_NAME          | Name of the website front-end.                                                                 | AnyaLog    |
| KEY_LENGTH        | Length of key generated for user. Longer is more secure but may be harder for the user to use. | 4          |
| KEY_DICTIONARY    | Characters used to generate key. Must not contain ":".                                         | ABCDE12345 |
| LOG_EXPIRE_TIME   | Time in seconds for when log files should automatically be deleted.                            | 600        |


### Setup
Create database
```
yarn run create-db
```

Run `yarn run clear-logs` via a cronjob or similar every minute to clear expired logs.

Serve static files
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
		proxy_pass http://127.0.0.1:14025;
	}
}
```