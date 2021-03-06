// Deploy JS experiments by:
// 1) compiling index.html
// 2) adding PsychoJS library
// 3) (optionally) uploading to stager

// Modules
const Paths = require('../shared/Paths.cjs');
const Stager = require('../shared/Stager.cjs');
const fs = require('fs-extra');
const Mustache = require('mustache');
const CLIParser = require('../shared/CLIParser.cjs');
const TestCollector = require('../shared/TestCollector.cjs');
const NameSanitizer = require('../shared/NameSanitizer.cjs');

// const path = require('path');

// Get uploadExperiments CLI option
let uploadExperiments = CLIParser.parseOption({cli: 'uploadExperiments'}, false);
uploadExperiments = uploadExperiments !== undefined;
console.log('[deployExperiments.cjs] uploadExperiments is ' + uploadExperiments);

// If uploadExperiments enabled, get branch CLI option
let branch;
if (uploadExperiments) {
  branch = CLIParser.parseOption({env: 'GITHUB_REF', cli: 'branch'});
  branch = NameSanitizer.sanitize(branch);
  console.log('[deployExperiments.cjs] branch is ' + branch);
}

// Get label and collect experiments
let label = CLIParser.parseOption({cli: 'label'});
label = NameSanitizer.sanitize(label);
let tests = TestCollector.collectTests(label, true);

// Get template
let template = fs.readFileSync('./src/index.html', 'utf8');
// Get root node (it's in a separate file for injecting in karma tests)
let rootNode = fs.readFileSync('./src/root.html', 'utf8');
// Get includes
let includes = fs.readdirSync('./dist');

// Perform deployment
(async () => {
  // Copy and compile each experiment
  console.log('[deployExperiments.cjs] Deploying ' + tests.wdio.length + ' experiments');

  let jsExperiment;
  for (let test of tests.wdio) {
    console.log('[deployExperiments.cjs] Deploying ' + test.path);

    // Compile and write index.html
    let compiled = Mustache.render(template, { 
      rootNode: rootNode,
      experiment: test.experiment_file.substring(0, test.experiment_file.length - '.psyexp'.length)
    });
    // Check if JS version of experiment exists
    jsExperiment = 
    Paths.dir_staging + '/' + test.path + '/' +
      test.experiment_file.substring(0, test.experiment_file.length - '.psyexp'.length) + '.js';
    console.log(jsExperiment);
    if (!fs.existsSync(jsExperiment)) {
      throw new Error(
        'Error deploying ' + test.path + '. Could not find ' +
          + jsExperiment + '; ' +
        'has the experiment been compiled from psyexp to JS?'
      )
    }

    fs.outputFileSync(
      Paths.dir_staging + '/' + test.path + '/index.html', 
      compiled
    );

    // Copy dist/ to lib/
    fs.copySync(
      './dist',
      Paths.dir_staging + '/' + test.path + '/lib'
    );
  }

  // Upload experiments to stager
  if (uploadExperiments) {
    console.log('[deployExperiments.cjs] uploading experiments');
    await Stager.deleteDirectory(
      'experiments/html/' + branch
    );
    await Stager.uploadDirectory(
      Paths.dir_staging,
      'experiments/html/' + branch
    )
  }
})();