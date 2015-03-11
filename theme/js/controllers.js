// Get all Optimate data with angular treeview using traversal
(function(){
  "use strict";
  var myApp = angular.module('myApp', ['angularTreeview']);
  myApp.controller('myController',['$scope', '$http',
    function($scope, $http){
      $http.get('http://127.0.0.1:8100').success
      (function(data)
        {$scope.roleList = data;}
      );

      // Toggle if the modal dialog displays or not
      // $scope.modalShown = false;
      // console.log($scope.modalShown);
      // $scope.toggleModal = function() {
      //   console.log("shown: " + $scope.modalShown);
      //   $scope.modalShown = !$scope.modalShown;
      //   console.log("shown after: " + $scope.modalShown);
      // };

      // $scope.openModal = function(){
      //   $scope.modalShown = true;
      // };

      // $scope.logClose = function() {
      //   $scope.modalShown = false;
      //   console.log("modal shown: " + $scope.modalShown);
      // };
      $scope.formData = {};
      $scope.closeModal = function(){
        $scope.modalShown = false;
        }
      }]
    );
})();
