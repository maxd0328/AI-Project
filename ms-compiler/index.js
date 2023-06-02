const definitions = require('./src/definitions');

const compiler = require('./src/compiler');
const decompiler = require('./src/decompiler');

const compile = compiler.compile;
const decompile = decompiler.decompile;

const matejScriptType = compiler.matejScriptType;

const KEYS = definitions.KEYS;
const ANNOTATIONS = definitions.ANNOTATIONS;
const getKeyRegex = definitions.getKeyRegex;
const getEnumRegex = definitions.getEnumRegex;
const getAnnotationRegex = definitions.getAnnotationRegex;

module.exports = {
    compile,
    decompile,
    matejScriptType,
    KEYS,
    ANNOTATIONS,
    getKeyRegex,
    getEnumRegex,
    getAnnotationRegex
};
