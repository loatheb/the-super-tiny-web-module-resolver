# The Super Tiny Web Module Resolver
Simple js bundler written in <del>50</del>100 lines of code.

Also, before adding dynamic require support, it's just under 50 lines. (:

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
