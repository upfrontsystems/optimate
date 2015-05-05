"use strict";
var myApp = angular.module('myApp', [
                    'allControllers',
                    'ngRoute',
                    'ui.bootstrap']);

myApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'partials/projects.html',
        controller: 'projectsController'
      }).
      when('/projects', {
        templateUrl: 'partials/projects.html',
        controller: 'projectsController'
      }).
      when('/company_information', {
        templateUrl: 'partials/company_information.html',
        controller: 'companyinformationController'
      }).
      when('/clients', {
        templateUrl: 'partials/clients.html',
        controller: 'clientsController'
      }).
      when('/suppliers', {
        templateUrl: 'partials/suppliers.html',
        controller: 'suppliersController'
      })
  }]);
