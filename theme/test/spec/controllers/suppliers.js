'use strict';

describe('Controller: suppliersController', function () {

  // load the controller's module
  beforeEach(module('myApp'));

  var suppliersCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    suppliersCtrl = $controller('suppliersController', {
      $scope: scope
    });
  }));

  it('should have suppliers in the jsonlist', function () {
    expect(scope.jsonsuppliers.length).not.toBe(null);
  });
});
