const definitions = require('./src/Definitions');

const compiler = require('./src/Compiler');
const decompiler = require('./src/Decompiler');

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
