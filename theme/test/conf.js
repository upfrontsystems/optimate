// conf.js
exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: [
        'spec/login-test.js',
        'spec/projects-test.js'
        ],
  capabilities: {
    browserName: 'firefox'
  },
  rootElement: '.main-container'
};
