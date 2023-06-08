
class Assertions {

    static conjunction() {
        return new AssertConjunction();
    }

    static disjunction() {
        return new AssertDisjunction();
    }

    constructor() {
        this.funcs = [];
    }

    assert(value) {
        throw new Error('This method is unimplemented in the super class');
    }

    custom(func) {
        this.funcs.push(func);
        return this;
    }

    nested(assertions) {
        return this.custom(value => assertions.assert(value));
    }

    not(assertions) {
        return this.custom(value => !assertions.assert(value));
    }

    isUndefined() {
        return this.custom(value => typeof value === 'undefined');
    }

    isNotUndefined() {
        return this.custom(value => typeof value !== 'undefined');
    }

    isNull() {
        return this.custom(value => value === null);
    }

    isNotNull() {
        return this.custom(value => value !== null);
    }

    isTruthy() {
        return this.custom(value => !!value);
    }

    isFalsy() {
        return this.custom(value => !value);
    }

    isInt() {
        return this.custom(value => Number.isInteger(value));
    }

    isDecimal() {
        return this.custom(value => typeof value === 'number' && isFinite(value));
    }

    isNumeric() {
        return this.custom(value => typeof value === 'number');
    }

    isString() {
        return this.custom(value => typeof value === 'string' || typeof value === 'number');
    }

    isObject() {
        return this.custom(value => typeof value === 'object');
    }

    isFunction() {
        return this.custom(value => typeof value === 'function');
    }

    isArray() {
        return this.custom(value => Array.isArray(value));
    }

    isEmpty() {
        return this.custom(value => !value.length)
    }

    isNotEmpty() {
        return this.custom(value => value.length);
    }

    hasLengthBetween(lowerBound, upperBound) {
        return this.custom(value => value.length >= lowerBound && value.length <= upperBound);
    }

    hasMinimumLength(bound) {
        return this.custom(value => value.length >= bound);
    }

    hasMaximumLength(bound) {
        return this.custom(value => value.length <= bound);
    }

    matches(regex) {
        return this.custom(value => regex.test(value));
    }

    isOneOf(...values) {
        return this.custom(value => values.includes(value));
    }

    greaterThan(bound) {
        return this.custom(value => value > bound);
    }

    lessThan(bound) {
        return this.custom(value => value < bound);
    }

    greaterThanOrEqual(bound) {
        return this.custom(value => value >= bound);
    }

    lessThanOrEqual(bound) {
        return this.custom(value => value <= bound);
    }

    between(lowerBound, upperBound) {
        return this.custom(value => value >= lowerBound && value <= upperBound);
    }

    betweenExclusive(lowerBound, upperBound) {
        return this.custom(value => value > lowerBound && value < upperBound);
    }

}

Object.getOwnPropertyNames(Assertions.prototype).forEach(funcName => {
    if(!['constructor', 'assert', 'conjunction', 'disjunction'].includes(funcName) && typeof Assertions.prototype[funcName] === 'function') {
        Assertions[funcName] = function(...args) {
            return Assertions.conjunction()[funcName](...args);
        }
    }
});

class AssertConjunction extends Assertions {

    constructor() {
        super();
    }

    assert(value) {
        for(const func of this.funcs)
            if(!func(value))
                return false;
        return true;
    }

}

class AssertDisjunction extends Assertions {

    constructor() {
        super();
    }

    assert(value) {
        for(const func of this.funcs)
            if(func(value))
                return true;
        return this.funcs.length <= 0;
    }

}

module.exports = Assertions;
