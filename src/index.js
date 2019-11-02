const fs = require('fs');
const path = require('path');
const config = require(path.resolve(__dirname, 'packer.config.js'));

const funcWrapper = ['function (require, module, exports) {', '}'];
const modulePathIdMap = {};
const moduleList = [];

deepTravel(path.resolve(__dirname, config.base || '', config.entry || 'index.js'), moduleList);

fs.writeFileSync(
    path.resolve(__dirname, config.base || '', config.output || 'index.bundle.js'),
    fs.readFileSync('bundle.boilerplate', 'utf-8')
        .replace('/* code-str-template */', moduleList.join(','))
);

function deepTravel(currentModuleAbsolutePath, moduleList) {
    const reg = /require\(["'](.+?)["']\)/g;
    const currentModuleContent = fs.readFileSync(currentModuleAbsolutePath, 'utf-8');
    let currentModuleReplacedContent = currentModuleContent;
    let result = null;
    while ((result = reg.exec(currentModuleContent)) !== null) {
        const [, modulePath] = result;
        const childModuleAbsolutePath = path.resolve(path.dirname(currentModuleAbsolutePath), modulePath);
        if (modulePathIdMap.hasOwnProperty(childModuleAbsolutePath)) continue;
        deepTravel(childModuleAbsolutePath, moduleList);
        currentModuleReplacedContent = currentModuleContent.replace(new RegExp(modulePath, 'g'), modulePathIdMap[childModuleAbsolutePath]);
    }
    const funcStr = `${funcWrapper[0]}\n${currentModuleReplacedContent}\n${funcWrapper[1]}`;
    moduleList.push(funcStr);
    modulePathIdMap[currentModuleAbsolutePath] = moduleList.length - 1;
}
