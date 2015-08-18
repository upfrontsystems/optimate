// conf.js
exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: [
        'spec/login-test.js',
        'spec/projects-test.js',
        'spec/orders-test.js'
        ],
  capabilities: {
    browserName: 'firefox'
  },
  rootElement: '.main-container',
  allScriptsTimeout: 20000
};
