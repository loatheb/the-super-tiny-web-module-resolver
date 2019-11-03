# The Super Tiny Web Module Resolver
simple js bundler written in 50 lines of code.

## feature

- [x] bundle commonjs module
- [x] dynamic import/require.ensure

## config

```js
// packer.config.js
module.exports = {
    base: "./test/case1", // default current __dirname
    entry: "index.js", // default index.js
    output: "bundle.js" // default index.bundle.js
};
```

or

```js
// packer.config.js
module.exports = [{
    base: './test/case1'
}, {
    base: './test/case2'
}, {
    base: './test/case3'
}];
```

## usage

```shell
./bin/packer
```
