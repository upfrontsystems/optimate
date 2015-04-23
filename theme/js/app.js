"use strict";
var myApp = angular.module('myApp', [
                    'angularTreeview',
                    'ui.bootstrap',
                    'ngRoute',
                    'allControllers']);

myApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'projects.html',
        controller: 'treeviewController'
      }).
      when('/projects', {
        templateUrl: 'projects.html',
        controller: 'treeviewController'
      }).
      when('/clients', {
        templateUrl: 'clients.html',
        controller: 'clientsController'
      }).
      when('/suppliers', {
        templateUrl: 'suppliers.html',
        controller: 'suppliersController'
      })
  }]);
