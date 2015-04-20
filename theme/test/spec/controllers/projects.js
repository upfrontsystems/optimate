'use strict';

describe('Controller: projectlistController', function () {

  // load the controller's module
  beforeEach(module('myApp'));

  var projectsCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    projectsCtrl = $controller('projectslistController', {
      $scope: scope
    });
  }));

  it('should have projects in the list', function () {
    expect(scope.roleList.length).not.toBe(null);
  });
});
