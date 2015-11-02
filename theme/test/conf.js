// conf.js
exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: [
        'spec/login-test.js',
        'spec/company-info-test.js',
        'spec/units-test.js',
        'spec/cities-test.js',
        'spec/clients-test.js',
        'spec/suppliers-test.js',
        'spec/projects-test.js',
        'spec/orders-test.js',
        'spec/invoices-test.js',
        'spec/valuations-test.js',
        'spec/claims-test.js',
        'spec/payments-test.js',
        'spec/users-test.js',
        'spec/cleanup-tests.js'
        ],
  capabilities: {
    browserName: 'firefox'
  },
  rootElement: '.main-container',
  allScriptsTimeout: 50000
};
