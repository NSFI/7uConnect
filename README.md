## What you need to build 7uConnect

You just need to have [Node.js](http://nodejs.org/) and [Git](http://git-scm.com/).


### Node.js

* [Install Node.js](https://nodejs.org/en/download/)

### Git

* [Install Git](http://git-scm.com/book/en/Getting-Started-Installing-Git)


## How to build 7uConnect

Clone a copy of the main 7uConnect git repository by running:

```bash
$ git clone https://github.com/morrain/7uConnect.git 7uConnect
$ cd 7uConnect
```

Install `gulp-cli` (>= 1.2.2) globally (which provides the `gulp` command):

```bash
$ npm install -g gulp-cli
```

(you can also use the local `gulp` executable located in `node_modules/.bin/gulp`).

Install the Node.js dependencies:

```bash
$ npm install
```

Finally, run `gulp dist` (or just `gulp`) to get:

* `dist/qiyuconnect.js`: uncompressed version of 7uConnect.
* `dist/qiyuconnect.min.js`: compressed version of 7uConnect.

```bash
$ gulp dist
```


## Test units

```bash
$ gulp test
```


