"use strict";
var myApp = angular.module('myApp', [
                    'angularTreeview',
                    'ngRoute',
                    'ui.bootstrap']);

myApp.directive('customModals', function () {
    return {
        restrict: 'A',
        require: '?ngModel',
        transclude: true,
        scope:{
            ngModel: '='
        },
        templateUrl: 'modal_templates/addbudgetgroup.html',
        link: function(scope, el, attrs, transcludeFn){
            scope.modalId = attrs.modalId;
        }
    };
});


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
      }).
      when('/addbudgetgroup', {
        templateUrl: 'partials/projects.html',
        controller: 'addBudgetGroupControl',
      }).
      when('/addbudgetitem', {
        templateUrl: 'partials/projects.html',
        controller: 'addBudgetItemControl'
      }).
      when('/addcomponent', {
        templateUrl: 'partials/projects.html',
        controller: 'addComponentControl'
      }).
      when('/addresource', {
        templateUrl: 'partials/projects.html',
        controller: 'addResourceControl'
      })
  }]);
