"use strict";
var myApp = angular.module('myApp', [
                    'angularTreeview',
                    'ngModal',
                    'ui.bootstrap',
                    'ngRoute',
                    'allControllers']);

myApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'projects.html',
        controller: 'projectlistController'
      }).
      when('/projects', {
        templateUrl: 'projects.html',
        controller: 'projectlistController'
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
