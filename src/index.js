const {existsSync, writeFileSync, readFileSync, mkdirSync} = require('fs');
const {dirname, resolve} = require('path');

const root = dirname(require.main.paths[1]);

const funcWrapper = ['function (require, module, exports) {', '}'];
const getFilePath = modulePath => [modulePath, `${modulePath}.js`].find(existsSync);

main(require(resolve(root, 'packer.config')));

function main(config) {
    if (Array.isArray(config)) return config.map(main);

    const defaultConfig = {
        base: root, 
        entry: 'index', 
        output: 'index.bundle.js', 
        public: (config.base || config.output) ? resolve(config.base || '', dirname(config.output || '')).replace(root, '') + '/' : '/'
    };
    const bundleConfig = Object.assign({}, defaultConfig, config);

    const modulePathIdMap = {};
    const moduleList = [];
    const chunkModuleList = [];
    const chunkModulePathIdMap = {};

    deepTravel(resolve(root, bundleConfig.base, bundleConfig.entry), moduleList, modulePathIdMap, chunkModuleList, chunkModulePathIdMap);
    chunkModuleList.forEach((chunk, id) => {
        const dynamicTemplate = readFileSync(resolve(__dirname, 'chunk.boilerplate'), 'utf-8');

        writeFileSync(
            resolve(root, bundleConfig.base, `chunk_${id}.js`),
            dynamicTemplate
                .replace('/* dynamic-require-chunk-id */', `"chunk_${id}"`)
                .replace('/* dynamic-require-chunk-code */', chunk),
            'utf-8'
        );
    });

    return writeFileSync(
        resolve(root, bundleConfig.base, bundleConfig.output),
        readFileSync(resolve(__dirname, 'bundle.boilerplate'), 'utf-8')
            .replace('/* dynamic-import-status */', !!chunkModuleList.length)
            .replace('/* runtime-config */', JSON.stringify(bundleConfig))
            .replace('/* code-str-template */', moduleList.join(',')),
        'utf-8'
    );
}

function deepTravel(fullPath, moduleList, modulePathIdMap, chunkModuleList, chunkModulePathIdMap, isChunk, childModules = []) {
    const modulePathMatcher = /require(\.ensure)?\(["`'](.+?)["`']\)/g;
    const moduleText = readFileSync(getFilePath(fullPath), 'utf-8');
    let moduleContent = moduleText;
    let match = null;
    while ((match = modulePathMatcher.exec(moduleText)) !== null) {
        const [, isDynamicModule, modulePath] = match;
        const childModuleAbsolutePath = resolve(dirname(getFilePath(fullPath)), modulePath);
        if ((isDynamicModule ? chunkModulePathIdMap : modulePathIdMap).hasOwnProperty(childModuleAbsolutePath)) continue;
        childModules.push(modulePath);
        deepTravel(childModuleAbsolutePath, moduleList, modulePathIdMap, chunkModuleList, chunkModulePathIdMap, !!isDynamicModule);
        childModules.forEach(childModule => {
            moduleContent = moduleContent.replace(
                new RegExp(childModule, 'g'),
                isDynamicModule ? `chunk_${chunkModulePathIdMap[childModuleAbsolutePath]}` : modulePathIdMap[childModuleAbsolutePath]
            );
        });
    }
    const funcStr = `${funcWrapper[0]}\n${moduleContent}\n${funcWrapper[1]}`;
    isChunk 
        ? cacheModule(chunkModuleList, chunkModulePathIdMap, funcStr, fullPath)
        : cacheModule(moduleList, modulePathIdMap, funcStr, fullPath);
}

function cacheModule(list, map, listVal, mapKey) {
    list.push(listVal);
    map[mapKey] = list.length - 1;
}