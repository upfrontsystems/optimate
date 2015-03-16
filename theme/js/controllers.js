// Get all Optimate data with angular treeview using traversal
(function(){
    "use strict";
    var myApp = angular.module('myApp', ['angularTreeview']);
    myApp.controller('myController',['$scope', '$http',
        function($scope, $http) {
            $http.get('http://127.0.0.1:8100').success(function(data) {
                $scope.roleList = data;
            });
            $scope.formData = {};
            $scope.closeModal = function() {
                $scope.modalShown = false;
            }
        }
    ]);
})();
