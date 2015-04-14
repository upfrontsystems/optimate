var allControllers = angular.module('allControllers', []);

// controller for the Client data from the server
allControllers.controller('clientsController', ['$scope', '$http', '$modal', '$log',
    function($scope, $http, $modal, $log) {
        var req = {
            method: 'GET',
            url: 'http://127.0.0.1:8100/clients',
        };
        $http(req).success(function(data){
            $scope.jsonclients = data;
        });

        $scope.addNewClient = function(){
            var name = $scope.formData.inputName;
            $scope.formData.inputName = "";
            var address = $scope.formData.inputAddress;
            $scope.formData.inputAddress = "";
            var city = $scope.formData.inputCity;
            $scope.formData.inputCity = "";
            var sp = $scope.formData.inputStateProvince;
            $scope.formData.inputStateProvince = "";
            var country = $scope.formData.inputCountry;
            $scope.formData.inputCountry = "";
            var zip = $scope.formData.inputZip;
            $scope.formData.inputZip = "";
            var fax = $scope.formData.inputFax;
            $scope.formData.inputFax = "";
            var phone = $scope.formData.inputPhone;
            $scope.formData.inputPhone = "";
            var cell = $scope.formData.inputCellular;
            $scope.formData.inputCellular = "";
            var contact = $scope.formData.inputContact;
            $scope.formData.inputContact = "";

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
            }).success(function (response) {
                console.log(response);
                var data = response;
                console.log("added: " + data['newid']);
            });
        };

        var ModalInstanceCtrl = function ($scope, $modalInstance, editingClient, id) {
          $scope.editingClient = editingClient;

          $scope.editClient = function() {
            $http({
                method: 'PUT',
                url: 'http://localhost:8100/' + id + '/client',
                data:{'Name': $scope.editingClient['Name'],
                        'Address': $scope.editingClient['Address'],
                        'City': $scope.editingClient['City'],
                        'StateProvince': $scope.editingClient['StateProvince'],
                        'Country': $scope.editingClient['Country'],
                        'Zipcode': $scope.editingClient['Zipcode'],
                        'Fax': $scope.editingClient['Fax'],
                        'Phone': $scope.editingClient['Phone'],
                        'Cellular': $scope.editingClient['Cellular'],
                        'Contact': $scope.editingClient['Contact']}
            }).success(function () {
                console.log("edited");
            });
            $modalInstance.close();
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        };

        $scope.getEditClient = function(id) {
            var req = {
            method: 'GET',
            url: 'http://127.0.0.1:8100/' + id + '/client',
            };
            $http(req).success(function(data) {
                $scope.editingClient = data;
                var modalInstance = $modal.open({
                    templateUrl: 'editClientModal.html',
                    controller: ModalInstanceCtrl,
                    resolve: {
                        editingClient: function () {
                            return $scope.editingClient;
                        },
                        id: function () {
                            return id;
                        }
                    }
                });
            });
        };

        $scope.deleteClient = function(id){
            var req = {
            method: 'DELETE',
            url: 'http://127.0.0.1:8100/' + id + '/client',
            };
            $http(req).success(function(data){
                alert("Client deleted")
            });
        };
    }
]);

allControllers.controller('projectlistController',['$scope', '$http',
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
    allControllers.controller('treeviewController',['$scope', '$http',
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

allControllers.controller('suppliersController', ['$scope', '$http', '$modal', '$log',
    function($scope, $http, $modal, $log) {
        var req = {
            method: 'GET',
            url: 'http://127.0.0.1:8100/suppliers'
        };
        $http(req).success(function(data){
            $scope.jsonsuppliers = data;
        });

        $scope.addNewSupplier = function(){
            var name = $scope.formData.inputName;
            $scope.formData.inputName = "";
            var address = $scope.formData.inputAddress;
            $scope.formData.inputAddress = "";
            var city = $scope.formData.inputCity;
            $scope.formData.inputCity = "";
            var sp = $scope.formData.inputStateProvince;
            $scope.formData.inputStateProvince = "";
            var country = $scope.formData.inputCountry;
            $scope.formData.inputCountry = "";
            var zip = $scope.formData.inputZip;
            $scope.formData.inputZip = "";
            var fax = $scope.formData.inputFax;
            $scope.formData.inputFax = "";
            var phone = $scope.formData.inputPhone;
            $scope.formData.inputPhone = "";
            var cell = $scope.formData.inputCellular;
            $scope.formData.inputCellular = "";
            var contact = $scope.formData.inputContact;
            $scope.formData.inputContact = "";

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
        };

        var ModalInstanceCtrl = function ($scope, $modalInstance, editingSupplier, id) {
          $scope.editingSupplier = editingSupplier;

          $scope.editSupplier = function() {
            $http({
                method: 'PUT',
                url: 'http://localhost:8100/' + id + '/supplier',
                data:{'Name': $scope.editingSupplier['Name'],
                        'Address': $scope.editingSupplier['Address'],
                        'City': $scope.editingSupplier['City'],
                        'StateProvince': $scope.editingSupplier['StateProvince'],
                        'Country': $scope.editingSupplier['Country'],
                        'Zipcode': $scope.editingSupplier['Zipcode'],
                        'Fax': $scope.editingSupplier['Fax'],
                        'Phone': $scope.editingSupplier['Phone'],
                        'Cellular': $scope.editingSupplier['Cellular'],
                        'Contact': $scope.editingSupplier['Contact']}
            }).success(function () {
                console.log("edited");
            });
            $modalInstance.close();
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        };

        $scope.getEditSupplier = function(id) {
            var req = {
            method: 'GET',
            url: 'http://127.0.0.1:8100/' + id + '/supplier',
            };
            $http(req).success(function(data) {
                $scope.editingSupplier = data;

                var modalInstance = $modal.open({
                    templateUrl: 'editSupplierModal.html',
                    controller: ModalInstanceCtrl,
                    resolve: {
                        editingSupplier: function () {
                            return $scope.editingSupplier;
                        },
                        id: function () {
                            return id;
                        }
                    }
                });
            });
        };

        $scope.deleteSupplier = function(id){
            var req = {
            method: 'DELETE',
            url: 'http://127.0.0.1:8100/' + id + '/supplier',
            };
            $http(req).success(function(data){
                alert("Supplier deleted")
            });
        };
    }
]);
