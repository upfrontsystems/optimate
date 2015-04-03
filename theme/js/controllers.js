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
            // aux function - checks if object is already in list based on ID
            function containsObject(obj, list) {
                var i;
                for (i = 0; i < list.length; i++) {
                    if (list[i].ID === obj.ID) {
                        return true;
                    }
                }
                return false;
            }
            $scope.loadProject = function () {
                var id = $('#project-select').find(":selected").val()
                var url = 'http://127.0.0.1:8100/projectview/' + id + '/'
                var req = {
                    method: 'GET',
                    url: url,
                }
                $http(req).success(function(data) {
                    if (!(containsObject(data[0], $scope.roleList))) {
                        // add latest select project, if not already in the list
                        $scope.roleList.push(data[0]); 
                        // sort alphabetically by project name
                        $scope.roleList.sort(function(a, b) {
                            var textA = a.Name.toUpperCase();
                            var textB = b.Name.toUpperCase();
                            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                        });
                    }
                });  
            };
            $scope.roleList = [];
            $scope.formData = {};
            $scope.closeModal = function() {
                $scope.modalShown = false;
            }
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
