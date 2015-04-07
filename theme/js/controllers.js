// Get all Optimate data with angular treeview using traversal
(function(){
    "use strict";
    var myApp = angular.module('myApp', ['angularTreeview', 'ngModal']);
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
                $scope.jsonclients = data;
            })
            var addDialogShown = false;
            $scope.addNewClient = function(){
                $scope.addDialogShown = false;

                var name = $scope.formData.inputName;
                $scope.formData.inputName = "";
                var address = $scope.formData.inputAddress;
                $scope.formData.inputAddress = "";
                var city = $scope.formData.inputCity;
                $scope.formData.inputCity = ""
                var sp = $scope.formData.inputStateProvince;
                $scope.formData.inputStateProvince = ""
                var country = $scope.formData.inputCountry;
                $scope.formData.inputCountry = ""
                var zip = $scope.formData.inputZip;
                $scope.formData.inputZip = ""
                var fax = $scope.formData.inputFax;
                $scope.formData.inputFax = ""
                var phone = $scope.formData.inputPhone;
                $scope.formData.inputPhone = ""
                var cell = $scope.formData.inputCellular;
                $scope.formData.inputCellular = ""
                var contact = $scope.formData.inputContact;
                $scope.formData.inputContact = ""

                console.log("Adding " + name +
                    ", " + address);
                $http({
                    method: 'POST',
                    url: 'http://localhost:8100/0/client',
                    data:{'Name': name,
                            'Address': address,
                            'City': city,
                            'StateProvince': sp,
                            'Country': country,
                            'Zip': zip,
                            'Fax': fax,
                            'Phone': phone,
                            'Cellular': cell,
                            'Contact': contact}
                }).success(function () {
                    console.log("added");
                });
            }

            var editDialogShown = false;
            var selectedClient = 0;
            $scope.getEditClient = function(id){
                var req = {
                method: 'GET',
                url: 'http://127.0.0.1:8100/' + id + '/client',
                }
                $http(req).success(function(data){
                    $scope.formData.inputName = data.Name;
                    $scope.formData.inputAddress = data.Address;
                    $scope.formData.inputCity = data.City;
                    $scope.formData.inputStateProvince = data.StateProvince;
                    $scope.formData.inputCountry = data.Country;
                    $scope.formData.inputZip = data.Zipcode;
                    $scope.formData.inputFax = data.Fax;
                    $scope.formData.inputPhone = data.Phone;
                    $scope.formData.inputCellular = data.Cellular;
                    $scope.formData.inputContact = data.Contact;
                })
                $scope.selectedClient = id
                $scope.editDialogShown = true;
            }

            $scope.editClient = function(){
                $scope.editDialogShown = false;

                var name = $scope.formData.inputName;
                $scope.formData.inputName = "";
                var address = $scope.formData.inputAddress;
                $scope.formData.inputAddress = "";
                var city = $scope.formData.inputCity;
                $scope.formData.inputCity = ""
                var sp = $scope.formData.inputStateProvince;
                $scope.formData.inputStateProvince = ""
                var country = $scope.formData.inputCountry;
                $scope.formData.inputCountry = ""
                var zip = $scope.formData.inputZip;
                $scope.formData.inputZip = ""
                var fax = $scope.formData.inputFax;
                $scope.formData.inputFax = ""
                var phone = $scope.formData.inputPhone;
                $scope.formData.inputPhone = ""
                var cell = $scope.formData.inputCellular;
                $scope.formData.inputCellular = ""
                var contact = $scope.formData.inputContact;
                $scope.formData.inputContact = ""

                console.log("Editing " + name +
                    ", " + address);
                $http({
                    method: 'PUT',
                    url: 'http://localhost:8100/' + $scope.selectedClient + '/client',
                    data:{'Name': name,
                            'Address': address,
                            'City': city,
                            'StateProvince': sp,
                            'Country': country,
                            'Zip': zip,
                            'Fax': fax,
                            'Phone': phone,
                            'Cellular': cell,
                            'Contact': contact}
                }).success(function () {
                    console.log("edited");
                });
            }

            $scope.deleteClient = function(id){
                var req = {
                method: 'DELETE',
                url: 'http://127.0.0.1:8100/' + id + '/client',
                }
                $http(req).success(function(data){
                    alert("Client deleted")
                })
            }
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
            var addDialogShown = false;
            $scope.addNewSupplier = function(){
                $scope.addDialogShown = false;

                var name = $scope.formData.inputName;
                $scope.formData.inputName = "";
                var address = $scope.formData.inputAddress;
                $scope.formData.inputAddress = "";
                var city = $scope.formData.inputCity;
                $scope.formData.inputCity = ""
                var sp = $scope.formData.inputStateProvince;
                $scope.formData.inputStateProvince = ""
                var country = $scope.formData.inputCountry;
                $scope.formData.inputCountry = ""
                var zip = $scope.formData.inputZip;
                $scope.formData.inputZip = ""
                var fax = $scope.formData.inputFax;
                $scope.formData.inputFax = ""
                var phone = $scope.formData.inputPhone;
                $scope.formData.inputPhone = ""
                var cell = $scope.formData.inputCellular;
                $scope.formData.inputCellular = ""
                var contact = $scope.formData.inputContact;
                $scope.formData.inputContact = ""

                console.log("Adding " + name +
                    ", " + address);
                $http({
                    method: 'POST',
                    url: 'http://localhost:8100/0/supplier',
                    data:{'Name': name,
                            'Address': address,
                            'City': city,
                            'StateProvince': sp,
                            'Country': country,
                            'Zip': zip,
                            'Fax': fax,
                            'Phone': phone,
                            'Cellular': cell,
                            'Contact': contact}
                }).success(function () {
                    console.log("added");
                });
            }

            var editDialogShown = false;
            var selectedSupplier = 0;
            $scope.getEditSupplier = function(id){
                var req = {
                method: 'GET',
                url: 'http://127.0.0.1:8100/' + id + '/supplier',
                }
                $http(req).success(function(data){
                    $scope.formData.inputName = data.Name;
                    $scope.formData.inputAddress = data.Address;
                    $scope.formData.inputCity = data.City;
                    $scope.formData.inputStateProvince = data.StateProvince;
                    $scope.formData.inputCountry = data.Country;
                    $scope.formData.inputZip = data.Zipcode;
                    $scope.formData.inputFax = data.Fax;
                    $scope.formData.inputPhone = data.Phone;
                    $scope.formData.inputCellular = data.Cellular;
                    $scope.formData.inputContact = data.Contact;
                })
                $scope.selectedSupplier = id
                $scope.editDialogShown = true;
            }

            $scope.editSupplier = function(){
                $scope.editDialogShown = false;

                var name = $scope.formData.inputName;
                $scope.formData.inputName = "";
                var address = $scope.formData.inputAddress;
                $scope.formData.inputAddress = "";
                var city = $scope.formData.inputCity;
                $scope.formData.inputCity = ""
                var sp = $scope.formData.inputStateProvince;
                $scope.formData.inputStateProvince = ""
                var country = $scope.formData.inputCountry;
                $scope.formData.inputCountry = ""
                var zip = $scope.formData.inputZip;
                $scope.formData.inputZip = ""
                var fax = $scope.formData.inputFax;
                $scope.formData.inputFax = ""
                var phone = $scope.formData.inputPhone;
                $scope.formData.inputPhone = ""
                var cell = $scope.formData.inputCellular;
                $scope.formData.inputCellular = ""
                var contact = $scope.formData.inputContact;
                $scope.formData.inputContact = ""

                console.log("Editing " + name +
                    ", " + address);
                $http({
                    method: 'PUT',
                    url: 'http://localhost:8100/' + $scope.selectedSupplier + '/supplier',
                    data:{'Name': name,
                            'Address': address,
                            'City': city,
                            'StateProvince': sp,
                            'Country': country,
                            'Zip': zip,
                            'Fax': fax,
                            'Phone': phone,
                            'Cellular': cell,
                            'Contact': contact}
                }).success(function () {
                    console.log("edited");
                });
            }

            $scope.deleteSupplier = function(id){
                var req = {
                method: 'DELETE',
                url: 'http://127.0.0.1:8100/' + id + '/supplier',
                }
                $http(req).success(function(data){
                    alert("Supplier deleted")
                })
            }
        }
    ]);
})();
