// Get all Optimate data with angular treeview using traversal
(function(){
    "use strict";
    var myApp = angular.module('myApp', ['angularTreeview']);
    // Angular function that retrieves the list of projects from the server
    myApp.controller('projectlistController',['$scope', '$http',
        function($scope, $http) {
            var req = {
                method: 'GET',
                url: 'http://127.0.0.1:8100/project_listing',
            }
            $http(req).success(function(data) {
                $scope.projectsList = data;
            });
        }
    ]);
    // Angular function that loads a specific project into the treeview
    // upon selection from the user
    myApp.controller('treeviewController',['$scope', '$http',
        function ProjectList($scope, $http) {
          $scope.loadProject = function () {
            var id = $('#project-select').find(":selected").val()
            var url = 'http://127.0.0.1:8100/projectview/' + id + '/'
            var req = {
                method: 'GET',
                url: url,
            }
            $http(req).success(function(data) {
                $scope.roleList = data;
            });
            $scope.formData = {};
            $scope.closeModal = function() {
                $scope.modalShown = false;
            }
          };
          $( document ).on( "click", "#select-project-submit", function( e ) { 
              $scope.loadProject();
          });      

        }
    ]);
    // Angular function that retrieves the Client data from the server
    myApp.controller('clientsController', ['$scope', '$http',
        function($scope, $http) {
            var req = {
                method: 'GET',
                url: 'http://127.0.0.1:8100/clients',
            }
            $http(req).success(function(data){
                $scope.jsonclients = data
            })
        }
    ]);
    // Angular function that retrieves the Supplier data from the server
    myApp.controller('suppliersController', ['$scope', '$http',
        function($scope, $http) {
            var req = {
                method: 'GET',
                url: 'http://127.0.0.1:8100/suppliers',
            }
            $http(req).success(function(data){
                $scope.jsonsuppliers = data
            })
        }
    ]);
})();
