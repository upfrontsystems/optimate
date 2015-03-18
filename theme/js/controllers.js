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
                    start: '100', // use blank '' string to show entire result
                    end: '105'
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
})();
