/*jshint expr: true*/
var logger = require('../../lib/log/logger.js');
var errorEventShim = require('../lib/ErrorEvent.js');
var ErrorEvent = window.ErrorEvent || errorEventShim;
var expect = require('expect.js');

function undefine(obj, prop) {
    var org = obj[prop];
    obj[prop] = undefined;
    return function restore() {
        obj[prop] = org;
    };
}

var ifBrowserHasDispatchEventIt = (function(){
    var foundError = false;
    try {
        undefine(window, 'onerror')();
        document.createEvent('ErrorEvent');
    } catch(e) {
        foundError = true;
    }

    if (foundError) {
        return it.skip;
    }
    return (typeof window.dispatchEvent == 'function' ? it : it.skip);
})();

describe('logger', function () {
	it('should default logLevel to 0 if not undefined', function () {
        var log = logger.create('no_loglevel_test', undefined, function () {});
        expect(log.level).to.equal(0);
    });

    it('should set logLevel when specified', function () {
        var log = logger.create('logLevel_test', '3', function () {});
        expect(log.level).to.equal(3);
    });

    it('should not send log message when logLevel is 0', function () {
        var logData = [];
        var out = function (obj) {
            logData.push(obj);
        };
        var log = logger.create('no_log_call', '0', out);
        log.debug('test');
        expect(logData.length).to.equal(0);
    });

    it('should send log message when logLevel is high enough', function () {
        var logData = [];
        var log = logger.create('log_debug_test', '4', function (obj) {
            logData.push(obj);
        });
        var startTime = new Date().getTime();

        log.debug('test');

        expect(logData.length).to.equal(1);
        expect(logData[0].msg).to.equal('test');
        expect(logData[0].level).to.equal(4);
        expect(logData[0].name).to.equal('log_debug_test');
        expect(logData[0].time).not.to.be.lessThan(startTime);
    });

    ifBrowserHasDispatchEventIt('should catch errors', function () {
        var logData = [];
        logger.create('error_test', '1', function (obj) {
            logData.push(obj);
        });

        var errorData = {
            message: 'Test error',
            filename: 'http://gardrtest.com/errorTest.js',
            lineno: 123
        };

        var restoreOnError = undefine(window, 'onerror');

        var evt;
        try {
            evt = new ErrorEvent('error', errorData);
        } catch(e) {
            evt = errorEventShim('error', errorData, 'ErrorEvent');
        }

        window.dispatchEvent(evt);

        restoreOnError();

        expect(logData.length).to.equal(1);
        var logObj = logData[0];

        expect(logObj.level).to.equal(1);
        expect(logObj.name).to.equal('error_test');
        expect(logObj.time).not.to.be(undefined);
    });
});
