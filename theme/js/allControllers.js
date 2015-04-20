// angular module that contains all the controllers
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
            var postdata = {};
            postdata['Name'] = $scope.formData.inputName;
            $scope.formData.inputName = "";
            postdata['Address'] = $scope.formData.inputAddress;
            $scope.formData.inputAddress = "";
            postdata['City'] = $scope.formData.inputCity;
            $scope.formData.inputCity = "";
            postdata['StateProvince'] = $scope.formData.inputStateProvince;
            $scope.formData.inputStateProvince = "";
            postdata['Country'] = $scope.formData.inputCountry;
            $scope.formData.inputCountry = "";
            postdata['Zipcode'] = $scope.formData.inputZip;
            $scope.formData.inputZip = "";
            postdata['Fax'] = $scope.formData.inputFax;
            $scope.formData.inputFax = "";
            postdata['Phone'] = $scope.formData.inputPhone;
            $scope.formData.inputPhone = "";
            postdata['Cellular'] = $scope.formData.inputCellular;
            $scope.formData.inputCellular = "";
            postdata['Contact'] = $scope.formData.inputContact;
            $scope.formData.inputContact = "";

            $http({
                method: 'POST',
                url: 'http://localhost:8100/0/client',
                data:postdata
            }).success(function (response) {
                postdata['ID'] = response['newid'];
                $scope.jsonclients.push(postdata);
                // sort alphabetically by client name
                $scope.jsonclients.sort(function(a, b) {
                    var textA = a.Name.toUpperCase();
                    var textB = b.Name.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                });
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
                $scope.editingClient['Name'] = "edited";
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

// Controller for the suppliers page
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
            var postdata = {};
            postdata['Name'] = $scope.formData.inputName;
            $scope.formData.inputName = "";
            postdata['Address'] = $scope.formData.inputAddress;
            $scope.formData.inputAddress = "";
            postdata['City'] = $scope.formData.inputCity;
            $scope.formData.inputCity = "";
            postdata['StateProvince'] = $scope.formData.inputStateProvince;
            $scope.formData.inputStateProvince = "";
            postdata['Country'] = $scope.formData.inputCountry;
            $scope.formData.inputCountry = "";
            postdata['Zipcode'] = $scope.formData.inputZip;
            $scope.formData.inputZip = "";
            postdata['Fax'] = $scope.formData.inputFax;
            $scope.formData.inputFax = "";
            postdata['Phone'] = $scope.formData.inputPhone;
            $scope.formData.inputPhone = "";
            postdata['Cellular'] = $scope.formData.inputCellular;
            $scope.formData.inputCellular = "";
            postdata['Contact'] = $scope.formData.inputContact;
            $scope.formData.inputContact = "";

            $http({
                method: 'POST',
                url: 'http://localhost:8100/0/supplier',
                data:postdata
            }).success(function (response) {
                postdata['ID'] = response['newid'];
                $scope.jsonsuppliers.push(postdata);
                // sort alphabetically by supplier name
                $scope.jsonsuppliers.sort(function(a, b) {
                    var textA = a.Name.toUpperCase();
                    var textB = b.Name.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                });
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

// Controller for loading the list of projects
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

allControllers.directive('projectslickgridjs', function() {
    return {
        require: '?ngModel',
        restrict: 'E',
        replace: true,
        template: '<div></div>',
        link: function($scope, element, attrs) {

            var grid;
            var data = [];
            var cell_large = 120;
            var cell_medium = 75;
            var cell_small = 50;
            var columns = [
                    {id: "name", name: "Name", field: "name",
                     width: cell_large, cssClass: "cell-title non-editable-column"},
                    {id: "budg_cost", name: "Total", field: "budg_cost",
                     width: cell_medium, cssClass: "cell non-editable-column"},
                    {id: "order_cost", name: "Order Cost", field: "order_cost",
                     width: cell_medium, cssClass: "cell non-editable-column"},
                    {id: "run_cost", name: "Run Cost", field: "run_cost",
                     width: cell_medium, cssClass: "cell non-editable-column"},
                    {id: "claim_cost", name: "Claim Cost", field: "claim_cost",
                     width: cell_medium, cssClass: "cell non-editable-column"},
                    {id: "income_rec", name: "Income Rec", field: "income_rec",
                     width: cell_medium, cssClass: "cell non-editable-column"},
                    {id: "client_cost", name: "Client Cost", field: "client_cost",
                     width: cell_medium, cssClass: "cell non-editable-column"},
                    {id: "proj_profit", name: "Proj. Profit", field: "proj_profit",
                     width: cell_medium, cssClass: "cell non-editable-column"},
                    {id: "act_profit", name: "Act. Profit", field: "act_profit",
                     width: cell_medium, cssClass: "cell non-editable-column"},
                    {id: "rate", name: "Rate", field: "rate",
                     width: cell_small, cssClass: "cell non-editable-column"},
                    {id: "quantity", name: "Quantity", field: "quantity", cssClass: "cell",
                     width: cell_medium, editor: Slick.Editors.Float},
                ];

            var options = {
                    editable: true,
                    enableAddRow: true,
                    enableCellNavigation: true,
                    asyncEditorLoading: true,
                    autoEdit: true,
                    syncColumnCellResize: true,
                };

            data = []
            grid = new Slick.Grid("#optimate-data-grid", data, columns, options);
            grid.setSelectionModel(new Slick.CellSelectionModel());

            // show tooltips on hover if the cellsize is so small, that an ellipsis
            // '...' is being shown.
            autotooltips_plugin = new Slick.AutoTooltips({enableForHeaderCells: true})
            grid.registerPlugin(autotooltips_plugin);

            grid.onAddNewRow.subscribe(function (e, args) {
                var item = args.item;
                grid.invalidateRow(data.length);
                data.push(item);
                grid.updateRowCount();
                grid.render();
            });

            // eventhandler to update grid data when a tree node is clicked
            $( document ).on( "click", ".treenode", function( e ) {
                var nodeid = $(this).attr('ID');
                var url = 'http://127.0.0.1:8100/nodegridview/' + nodeid + '/'
                $.ajax({
                    url: url,
                    dataType: "json",
                    success: function(data) {
                        var newcolumns = [];
                        if (data.length > 0){
                            if (data[0]['node_type'] == 'Resource'){
                                newcolumns = [
                                    {id: "name", name: "Name", field: "name",
                                     width: cell_large, cssClass: "cell-title non-editable-column"},
                                    {id: "rate", name: "Rate", field: "rate", cssClass: "cell",
                                     width: cell_small, editor: Slick.Editors.Float},
                                ];
                            }
                            else {
                                newcolumns = columns;
                            }

                        }
                        else {
                            newcolumns = columns;
                        }
                        grid.setColumns(newcolumns);
                        grid.setData(data);
                        grid.render();
                    }
                });
            });

            grid.onCellChange.subscribe(function (e, ctx) {
                var item = ctx.item
                console.log(item.id)
                $.ajax({
                    url: 'http://127.0.0.1:8100/update_value',
                    data: item,
                    dataType: "json",
                    success: function(data) {
                        console.log('id_'+ item.id + ' updated')
                    },
                });
            });
        }
    }
});
