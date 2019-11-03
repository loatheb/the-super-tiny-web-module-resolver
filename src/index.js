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
            .replace('/* runtime-config */', JSON.stringify(bundleConfig))
            .replace('/* code-str-template */', moduleList.join(',')),
        'utf-8'
    );
}

function deepTravel(currentModuleAbsolutePath, moduleList, modulePathIdMap, chunkModuleList, chunkModulePathIdMap, isChunk) {
    const modulePathMatcher = /require(\.ensure)?\(["`'](.+?)["`']\)/g;
    const currentModuleContent = readFileSync(getFilePath(currentModuleAbsolutePath), 'utf-8');
    let currentModuleReplacedContent = currentModuleContent;
    let match = null;
    while ((match = modulePathMatcher.exec(currentModuleContent)) !== null) {
        const [, isDynamicModule, modulePath] = match;
        const childModuleAbsolutePath = resolve(dirname(getFilePath(currentModuleAbsolutePath)), modulePath);
        if ((isDynamicModule ? chunkModulePathIdMap : modulePathIdMap).hasOwnProperty(childModuleAbsolutePath)) continue;
        deepTravel(childModuleAbsolutePath, moduleList, modulePathIdMap, chunkModuleList, chunkModulePathIdMap, isDynamicModule ? true : false);
        currentModuleReplacedContent = currentModuleContent.replace(
            new RegExp(modulePath, 'g'), 
            isDynamicModule ? `chunk_${chunkModulePathIdMap[childModuleAbsolutePath]}` : modulePathIdMap[childModuleAbsolutePath]
        );
    }
    const funcStr = `${funcWrapper[0]}\n${currentModuleReplacedContent}\n${funcWrapper[1]}`;
    if (!isChunk) {
        moduleList.push(funcStr);
        modulePathIdMap[currentModuleAbsolutePath] = moduleList.length - 1;
    }
    else {
        chunkModuleList.push(funcStr);
        chunkModulePathIdMap[currentModuleAbsolutePath] = chunkModuleList.length - 1;
    }
}
