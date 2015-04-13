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
        templateUrl: 'costsTab.html',
        controller: 'projectlistController'
      }).
      when('/costs', {
        templateUrl: 'costsTab.html',
        controller: 'projectlistController'
      }).
      when('/clients', {
        templateUrl: 'clientsTab.html',
        controller: 'clientsController'
      }).
      when('/suppliers', {
        templateUrl: 'suppliersTab.html',
        controller: 'suppliersController'
      })
  }]);
