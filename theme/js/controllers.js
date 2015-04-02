// Get all Optimate data with angular treeview using traversal
(function(){
    "use strict";
    var myApp = angular.module('myApp', ['angularTreeview']);
    myApp.controller('myController',['$scope', '$http',
        function($scope, $http) {
            var req = {
                method: 'GET',
                url: 'http://127.0.0.1:8100',
                params: {
                    start: '', // use blank '' string to show entire result
                    end: ''
                }
            }
            $http(req).success(function(data) {
                $scope.roleList = data;
            });
            $scope.formData = {};
            $scope.closeModal = function() {
                $scope.modalShown = false;
            }
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


