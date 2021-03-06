// Karma configuration
// Generated on Tue Dec 01 2020 14:30:27 GMT+0000 (Greenwich Mean Time)
const CLIParser = require('./CLIParser.cjs');
const BrowserStack = require('./BrowserStack.cjs');
const Paths = require('./Paths.cjs');
const TestCollector = require('./TestCollector.cjs');

// *** Parse CLI arguments
let [server, uploadReport, platform, test, testrun, branch, subset] = CLIParser.parseTestrunCLIOptions();

// Get label and construct specFiles
let label = parseOption({cli: 'label'});
let tests = TestCollector.collectTests(label);
let specFiles = tests.karma.map((test) => {
  return {pattern: test.path + '/' + test.testscript_file, type: 'module'};
});
console.log('[karma.conf.cjs] running ' + specFiles.length + ' specFiles');

// Construct testrun (2 remove!!!)
testrun = testrun === undefined? label: testrun;

// Construct browsers
let customLaunchers, browsers;
if (server === 'bs') {
  customLaunchers = require('./capabilities.' + server + '.cjs').getApiCapabilities(platform, subset);
} else {
  customLaunchers = {
    local_local_chrome_local: {
      base: 'Chrome',
      displayName: 'local_local_chrome_local'
    }
  };
}
browsers = Object.keys(customLaunchers);  

module.exports = function(config) {
  config.set({
    browserStack: server !== 'bs'? {}:
    {
      username: server === 'bs'? CLIParser.parseOption({env: 'BROWSERSTACK_USER'}, true, CLIParser.logSilent): undefined,
      accessKey: server === 'bs'? CLIParser.parseOption({env: 'BROWSERSTACK_ACCESSKEY'}, true, CLIParser.logSilent): undefined,
      project: 'PsychoJS_unit',
      build: BrowserStack.createBuildName(branch, testrun, test)
    },

    // define browsers
    customLaunchers: customLaunchers,
    browsers: browsers,
    
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '..',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.css', type: 'css'},
      {pattern: '../dist/psychojs.css', type: 'css'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.0/jquery.min.js', type: 'js'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js', type: 'js'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/seedrandom/3.0.1/seedrandom.min.js', type: 'js'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/4.8.7/pixi.min.js', type: 'js'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/PreloadJS/1.0.1/preloadjs.min.js', type: 'js'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.min.js', type: 'js'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.14.2/xlsx.full.min.js', type: 'js'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/log4javascript/1.4.9/log4javascript.min.js', type: 'js'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.74/Tone.js', type: 'js'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/howler/2.1.2/howler.min.js', type: 'js'},
      {pattern: 'https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.10/pako.min.js', type: 'js'},
      {pattern: '../dist/*.js', type: 'module', included: false},
      {pattern: '../src/root.html', type: 'dom'}
    ].concat(specFiles),


    // list of files / patterns to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: server === 'bs'? ['dots', 'json', 'BrowserStack']: ['dots', 'json'],
    jsonReporter: {
      stdout: true,
      outputFile: Paths.dir_tmp_unit_karma + '/results.json'
    },

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: server === 'bs'? 3: Infinity
  })
}
