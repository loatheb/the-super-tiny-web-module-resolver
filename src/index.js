const fs = require('fs');
const path = require('path');

const root = path.dirname(require.main.paths[1]);
const config = require(path.resolve(root, 'packer.config.js'));

const funcWrapper = ['function (require, module, exports) {', '}'];

main(config);

function main(config) {
    if (Array.isArray(config)) return config.map(main);

    const modulePathIdMap = {};
    const moduleList = [];
    deepTravel(path.resolve(root, config.base || '', config.entry || 'index.js'), moduleList, modulePathIdMap);

    fs.writeFileSync(
        path.resolve(root, config.base || '', config.output || 'index.bundle.js'),
        fs.readFileSync(path.resolve(__dirname, 'bundle.boilerplate'), 'utf-8')
            .replace('/* code-str-template */', moduleList.join(','))
    );
}

function getFilePath(modulePath) {
    return [
        modulePath,
        `${modulePath}.js`,
        `${modulePath}.json`,
        `${modulePath}.node`,
    ].find(fs.existsSync);
}

function deepTravel(currentModuleAbsolutePath, moduleList, modulePathIdMap) {
    const reg = /require\(["'](.+?)["']\)/g;
    const currentModuleContent = fs.readFileSync(getFilePath(currentModuleAbsolutePath), 'utf-8');
    let currentModuleReplacedContent = currentModuleContent;
    let result = null;
    while ((result = reg.exec(currentModuleContent)) !== null) {
        const [, modulePath] = result;
        const childModuleAbsolutePath = path.resolve(path.dirname(getFilePath(currentModuleAbsolutePath)), modulePath);
        if (modulePathIdMap.hasOwnProperty(childModuleAbsolutePath)) continue;
        deepTravel(childModuleAbsolutePath, moduleList, modulePathIdMap);
        currentModuleReplacedContent = currentModuleContent.replace(new RegExp(modulePath, 'g'), modulePathIdMap[childModuleAbsolutePath]);
    }
    const funcStr = `${funcWrapper[0]}\n${currentModuleReplacedContent}\n${funcWrapper[1]}`;
    moduleList.push(funcStr);
    modulePathIdMap[currentModuleAbsolutePath] = moduleList.length - 1;
}
