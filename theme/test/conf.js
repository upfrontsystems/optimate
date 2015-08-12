// conf.js
exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: [
        'spec/login.js',
        'spec/projects.js'
        ],
  capabilities: {
    browserName: 'firefox'
  },
  rootElement: '.main-container'
};
