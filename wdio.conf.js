// Modules
const fs = require('fs');
const Jimp = require('jimp');

// Extract platformPattern and wdioServer
let lastClaIndex = process.argv.length - 1;
let lastCla = process.argv[lastClaIndex];
let wdioServer;
let buildName;

// If last command-line argument isn't local or bs, assume it's a platformPattern, and second-last argument is wdioServer
if (!(['local', 'bs'].includes(lastCla))) {
  platformPattern = lastCla;
  lastClaIndex = process.argv.length - 2;
  wdioServer = process.argv[lastClaIndex];
} else {
  platformPattern = "*";
  wdioServer = lastCla;
}
console.log('platformPattern: ' + platformPattern);
console.log('wdioServer: ' + wdioServer);
if (!(['local', 'bs'].includes(wdioServer))) {
  console.log('CLI argument (' + wdioServer + ') was not recognized as valid ' +
    'wdioServer. Please use "local" for local server or "bs" for BrowserStack. If last CLI argument ' +
    'is neither of the above, it is assumed to be the platformPattern and the second-last CLI argument ' +
    'is assumed to be the wdioServer'
  );
  process.exit(1);
}

// If command-line argument before platformPattern and wdioServer starts with 'e2e', assume it's a test in SharedBehaviors.js
let specs, testOverride;
if (process.argv[lastClaIndex - 1].startsWith('e2e')) {
  testOverride = process.argv[lastClaIndex - 1];
  specs = ['./test/specs/single_test.js'];
  lastClaIndex--;
} else {
  testOverride = null;
  specs = ['./test/specs/all_tests.js'];
}
console.log('testOverride: ' + testOverride);

// And finally, if wdioeServer === 'bs', the command-line argument before all of the above specifies the build name
if (wdioServer === 'bs') {
  buildName = process.argv[lastClaIndex - 1];
} else {
  buildName = null;
}
console.log('buildName: ' + buildName);
// If buildName is the name of the default wdio config, assume a buildName is missing
if (buildName === 'wdio.conf.js') {
  console.log('The buildName CLI argunent was "' + buildName + '". Are you sure you specified a buildName?');
  process.exit(1);  
}

exports.config = {
  // Connect to browserstack is wdioServer is 'bs'
  user: wdioServer === 'bs' ? process.env.BROWSERSTACK_USER : undefined,
  key: wdioServer === 'bs' ? process.env.BROWSERSTACK_ACCESSKEY : undefined,

  // Number of instances run at same time
  maxInstances: 3, // 3

  // Local (local) or BrowserStack (bs) capabilities
  capabilities: require('./test/shared/capabilities.' + wdioServer).capabilities(buildName, platformPattern),

  // Local test-runner
  runner: 'local',

  // Test files & patterns to include & exclude
  specs: specs,
  exclude: [],
  //
  // ===================
  // Test Configurations
  // ===================
  // Define all options that are relevant for the WebdriverIO instance here
  //
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  logLevel: 'warn',
  //
  // Set specific log levels per logger
  //    logLevels: {
  //        webdriver: 'debug',
  //        '@wdio/applitools-service': 'debug',
  //        '@wdio/browserstack-service': 'debug'
  //    },
  logLevels: {
    webdriver: 'silent',
    '@wdio/applitools-service': 'silent',
    '@wdio/browserstack-service': 'silent'
  },
  outputDir: './.tmp/raw_logs',

  // Give up after X tests have failed (0 - don't bail)
  bail: 0,
  //
  // String prepended to each url
  baseUrl: '',

  // Default timeout for all waitFor* commands.
  waitforTimeout: 1000,

  // Test runner services
  services: wdioServer === 'bs' ? [] :
    [
      // Selenium-standalone; takes care of local browserdrivers 
      ['selenium-standalone', {
        logPath: './.tmp/selenium_logs',
        installArgs: {
          drivers: {
            chrome: { version: '84.0.4147.30' },
            firefox: { version: '0.26.0' },
            MicrosoftEdge: { version: '84.0.522.40' }
          }
        },
        args: {
          drivers: {
            chrome: { version: '84.0.4147.30' },
            firefox: { version: '0.26.0' },
            MicrosoftEdge: { version: '84.0.522.40' }
          }
        }
      }]
    ],

  // Framework settings
  framework: 'jasmine',
  // The number of times to retry the entire specfile when it fails as a whole
  specFileRetries: wdioServer === 'bs' ? 2 : 0,
  // Whether or not retried specfiles should be retried immediately or deferred to the end of the queue
  specFileRetriesDeferred: true,
  // Options to be passed to Jasmine.
  jasmineNodeOpts: {
    // Jasmine default timeout
    defaultTimeoutInterval: 90000,
    // Fail whole suite after first failed spec
    failFast: true,
    //
    // The Jasmine framework allows interception of each assertion in order to log the state of the application
    // or website depending on the result. For example, it is pretty handy to take a screenshot every time
    // an assertion fails.
    expectationResultHandler: function (passed, assertion) {
      // do something
    }
  },

  // Test reporters
  reporters: [
    'dot',
    ['json', {
      outputDir: './.tmp/json_logs',
      stdout: false
    }],
    // ['junit', {
    //   outputDir: './.tmp/junit_logs'
    // }]
  ],

  // =====
  // Hooks
  // =====
  /**
   * Gets executed once before all workers get launched.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   */
  onPrepare: function (config, capabilities) {
    // Construct and clean up .tmp
    let tmpDir = '.tmp';
    let subDirs = [
      'json_logs',       // json test reporter
      'processed_logs',  // Aggregated logs
      'raw_logs',        // webdriverio and web API logs
      // Screenshots
      'screenshots',
      'cutouts',
      'cutouts_resized',
      'selenium_logs'    // local selenium server logs
    ];
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    };
    let files, path;
    for (let subDir_i in subDirs) {
      path = tmpDir + '/' + subDirs[subDir_i];
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
      } else {
        files = fs.readdirSync(path);
        for (let file_i in files) {
          fs.unlinkSync(path + '/' + files[file_i]);
        }
      }
    }
  },
  /**
   * Gets executed before test execution begins. At this point you can access to all global
   * variables like `browser`. It is the perfect place to define custom commands.
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that are to be run
   */
  before: function (capabilities, specs) {
    // These function concern getting capabilities that are specified
    // in the config but not available in browser.capabilities during
    // the test run.
    browser.addCommand('getPlatformName', () => {
      return capabilities['e2e_robot:platform'];
    });
    browser.addCommand('getOsName', () => {
      return capabilities['bstack:options'].os;
    });
    browser.addCommand('getDeviceName', () => {
      return capabilities['bstack:options'].deviceName;
    });
   
    // Get resolution depending on OS and whether we're running local
    browser.addCommand('getResolution', () => {
      // Local; return a dummy resolution (1x1)
      if (browser.runningLocal()) {
        return "1x1";
      }
      let os = browser.getOsName();
      if (os === "OS X" || os === "Windows") {
        return capabilities['bstack:options'].resolution;
      } else if (os === "Android") {
        return browser.capabilities.deviceScreenSize;
      } else {
        // iOS, lookup from table
        return {
          'iPhone XS': '1125x2436',
          'iPhone 11 Pro Max': '1242x2688',
          'iPhone 11 Pro': '1125x2436',
          'iPhone 11': '828x1792',
          'iPhone 8': '750x1334',
          'iPhone SE 2020': '750x1334',
          'iPad Pro 12.9 2020': '2048x2732',
          'iPad Pro 12.9 2018': '2048x2732',
          'iPad Pro 11 2020': '1668x2388',
          'iPad 7th': '1620x2160'
        }[browser.getDeviceName()];
      }
    });
    // returns pointer type for use in Actions API
    browser.addCommand('getPointerType', () => {
      return browser.isMobile ? "touch" : "mouse";
    });    
    // returns true if we're running a local Selenium server
    browser.addCommand('runningLocal', () => {
      return wdioServer === 'local';
    });    
    // Making screenshots and saving them
    browser.addCommand('writeJimpImg', (img, name) => {
      img.write('.tmp/screenshots/' + name + ' ' + browser.getPlatformName() + '.png');
    });
    browser.addCommand('getJimpScreenshot', async () => {
      let screenshotBase64 = await browser.takeScreenshot();
      return (await Jimp.read(new Buffer.from(screenshotBase64, 'base64')));
    });
    browser.addCommand('writeScreenshot', (name) => {
      browser.writeJimpImg(browser.getJimpScreenshot(), name);
    });

    // Managing custom log-file
    browser.addCommand('logInit', () => {
      browser.capabilities.customLogs = {};
    });
    browser.addCommand('logAdd', (key, value) => {
      browser.capabilities.customLogs[key] = value;
    });
    browser.addCommand('logGet', () => {
      return browser.capabilities.customLogs;
    });

    // Get testOverride
    browser.addCommand('getTestOverride', () => {
      return testOverride;
    });

    // Print current sessionId | platform and init custom log
    console.log(browser.sessionId + ' | ' + browser.getPlatformName());
    browser.logInit();
    browser.logAdd('platform', browser.getPlatformName())
    browser.logAdd('resolution', browser.getResolution());
  }
}