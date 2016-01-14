'use strict';

var util = require('util');
var EventEmitter = require('events');
var Mocha = require('mocha');
var debug = require('debug')('mocha-parallel-tests');

function Watcher(maxParallel) {
    this._maxParallel = maxParallel || Number.POSITIVE_INFINITY;
    this._pendingTests = [];
    this._runners = {};

    EventEmitter.call(this);
}

// inherit EventEmitter stuff
util.inherits(Watcher, EventEmitter);

Watcher.prototype.addTest = function Watcher_addTest(file, options) {
    this._pendingTests.push({
        file: file,
        options: options
    });
};

Watcher.prototype.run = function () {
    var self = this;
    var runner;
    var test;

    while (this._pendingTests.length > 0) {
        if (Object.keys(this._runners).length === this._maxParallel) {
            break;
        }

        test = this._pendingTests.shift();

        // create closure to save test data
        runner = (function (test) {
            debug('run mocha ' + test.file);

            var mocha = new Mocha(test.options);
            mocha.addFile(test.file);

            var runner = mocha.run();
            runner.on('end', function () {
                delete self._runners[test.file];

                // emit end if all tests finished executing
                // otherwise run remaining pending tests
                if (!Object.keys(self._runners).length) {
                    self.emit('end');
                } else {
                    self.run();
                }
            });

            return runner;
        })(test);

        this._runners[test.file] = runner;
    }
};

module.exports = Watcher;