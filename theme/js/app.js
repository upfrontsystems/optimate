"use strict";
var myApp = angular.module('myApp', [
                    'angularTreeview',
                    'ngRoute',
                    'ui.bootstrap']);

myApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'partials/projects.html',
        controller: 'treeviewController'
      }).
      when('/projects', {
        templateUrl: 'partials/projects.html',
        controller: 'treeviewController'
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
