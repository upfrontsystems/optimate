'use strict';

describe('Controller: clientsController', function () {

  // load the controller's module
  beforeEach(module('myApp'));

  var clientsCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    clientsCtrl = $controller('clientsController', {
      $scope: scope
    });
  }));

  it('should have clients in the jsonlist', function () {
    expect(scope.jsonclients.length).not.toBe(null);
  });
});
