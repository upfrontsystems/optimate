// controller for the Invoice data from the server
myApp.controller('invoicesController', ['$scope', '$http', 'globalServerURL', '$timeout', 'SessionService', 'FileSaver',
    function($scope, $http, globalServerURL, $timeout, SessionService, FileSaver) {

        toggleMenu('invoices');
        $scope.dateTimeNow = function() {
            var d = new Date();
            // create a timezone agnostic date by setting time info to 0 and timezone to UTC.
            date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0));
            $scope.idate = date;
            $scope.pdate = date;
        };
        $scope.isDisabled = false;
        $scope.jsoninvoices = [];
        $scope.invoiceList = [];
        $scope.selectedInvoices = [];
        $scope.amounts = {};
        $scope.statusList = [{'Status':'Draft'}, {'Status': 'Due'}, {'Status': 'Paid'}];
        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });
        // get the currency
        SessionService.get_currency().then(function(c){
            $scope.currency = c;
        })

        // loading the project, client and supplier list
        $scope.clearFilters = function() {
            $scope.filters = {};
            $scope.showAmountInHand = false;
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.projectsList = data;
            });

            $http.get(globalServerURL + 'suppliers')
            .success(function(data) {
                $scope.suppliersList = data;
            });

            $http.get(globalServerURL + 'clients')
            .success(function(data) {
                $scope.clientsList = data;
            });
        }
        $scope.projectsList = [];
        $scope.suppliersList = [];
        $scope.clientsList = [];
        $scope.clearFilters();

        $scope.loadInvoiceSection = function() {
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices',
                params: $scope.filters
            };
            $http(req).success(function(response) {
                $scope.amounts = response.amounts;
                $scope.jsoninvoices = response.invoices;
                console.log("Invoices loaded");
            });
        }
        $scope.loadInvoiceSection();

        // filter the other filter options by what is selected
        $scope.filterBy = function(selection) {
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices/filter',
                params: $scope.filters
            };
            $http(req).success(function(response) {
                if (selection == 'project') {
                    if ($scope.filters.Project == null) {
                        $scope.showAmountInHand = false;
                        $scope.projectsList = response['projects'];
                    }
                    else{
                        $scope.showAmountInHand = true;
                    }
                    $scope.clientsList = response['clients'];
                    $scope.suppliersList = response['suppliers'];
                }
                else if (selection == 'client') {
                    if ($scope.filters.Client == null) {
                        $scope.clientsList = response['clients'];
                    }
                    $scope.projectsList = response['projects'];
                    $scope.suppliersList = response['suppliers'];
                }
                else if (selection == 'supplier') {
                    if ($scope.filters.Supplier == null) {
                        $scope.suppliersList = response['suppliers'];
                    }
                    $scope.clientsList = response['clients'];
                    $scope.projectsList = response['projects'];
                }
                else {
                    $scope.projectsList = response['projects'];
                    $scope.clientsList = response['clients'];
                    $scope.suppliersList = response['suppliers'];
                }
            })
        };

        // search for the orders that match the search term
        $scope.refreshOrders = function(searchterm) {
            if (searchterm.length > 0) {
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'orders',
                    params: {'OrderNumber': searchterm}
                };
                $http(req).success(function(response) {
                    response.pop();
                    // if nothing has been found, add a non-selectable option
                    if (response.length == 0){
                        response.push({'ID': 'No match found',
                                        'nothingFound': true})
                    }
                    $scope.ordersList = response;
                });
            }
        };

        $scope.orderSelected = function(item) {
            $scope.formData.OrderID = item.ID;
            if (item.Subtotal != undefined){
                $scope.formData.Amount = item.Subtotal;
                $scope.formData.VAT = (parseFloat(item.Total) -
                                            parseFloat(item.Subtotal)).toFixed(2);
                $scope.calculatedAmounts[0].amount = item.Subtotal;
                $scope.calculatedAmounts[1].amount = (parseFloat(item.Total) -
                                            parseFloat(item.Subtotal)).toFixed(2);
                $scope.calculatedAmounts[2].amount = item.Total;
                $scope.calculatedAmounts[3].amount = item.Total;
            }
        };

        // Adding or editing an invoice
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'invoice' + '/' + $scope.formData.id + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the invoice in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': 'invoice'};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'invoice/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new invoice to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': 'invoice'};
                    });
                }
            }
        };

        // add a new invoice to the list and sort
        $scope.handleNew = function(newinvoice) {
            $scope.jsoninvoices.push(newinvoice);
            // sort by invoice id
            $scope.jsoninvoices.sort(function(a, b) {
                var idA = a.id;
                var idB = b.id;
                return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
            });
            console.log ("Invoice added");
        }

        // handle editing an invoice
        $scope.handleEdited = function(editedinvoice) {
            // search for the invoice and edit in the list
            var result = $.grep($scope.jsoninvoices, function(e) {
                return e.id == editedinvoice.id;
            });
            var i = $scope.jsoninvoices.indexOf(result[0]);
            if (i>-1) {
                $scope.jsoninvoices[i] = editedinvoice;
            }
            console.log ("Invoice edited");
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'invoice',
                                'vat': '0.00'};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.dateTimeNow();
            $scope.formData['Invoicedate'] = $scope.idate;
            $scope.formData['Paymentdate'] = $scope.pdate;
            $scope.calculatedAmounts = [{'name': 'Subtotal', 'amount': ''},
                                        {'name': 'VAT', 'amount': ''},
                                        {'name': 'Total', 'amount': ''},
                                        {'name': 'Order total', 'amount': ''}];
            $scope.clearSelectedInvoices();
            $scope.ordersList = [];
            $scope.saveInvoiceModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'invoice/' + $scope.selectedInvoices[0].id + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.formData.selected = {'ID': response.OrderID,
                                            'Total': response.Ordertotal};
                $scope.calculatedAmounts = [{'name': 'Subtotal', 'amount': response.Amount},
                                        {'name': 'VAT', 'amount': response.VAT},
                                        {'name': 'Total', 'amount': response.Total},
                                        {'name': 'Order total', 'amount': response.Ordertotal}];
                $scope.refreshOrders(response.OrderID.toString());
                $scope.orderSelected($scope.formData.selected);
                $scope.idate = new Date($scope.formData['Invoicedate']);
                $scope.pdate = new Date($scope.formData['Paymentdate']);
                $scope.formData['NodeType'] = 'invoice';
            });
            // set each field dirty
            angular.forEach($scope.saveInvoiceModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete an invoice and remove from the list
        $scope.deleteInvoice = function(index) {
            $http({
                method: 'DELETE',
                url: globalServerURL + 'invoice' + '/' + $scope.selectedInvoices[index].ID + '/'
            }).success(function () {
                console.log("Deleted invoice " + $scope.selectedInvoices[index].ID);
                index+=1;
                if (index < $scope.selectedInvoices.length){
                    $scope.deleteInvoice(index);
                }
                else{
                    for (var i in $scope.selectedInvoices){
                        var result = $.grep($scope.jsoninvoices, function(e) {
                            return e.id == $scope.selectedInvoices[i].ID;
                        });
                        var ind = $scope.jsoninvoices.indexOf(result[0]);
                        if (ind>-1) {
                            $scope.jsoninvoices[ind].selected = false;
                            $scope.jsoninvoices.splice(ind, 1);
                        }
                    }
                }
            });
        };

        $scope.checkOrderNumber = function() {
            // check if the order exists and set the form valid or invalid
            $http.get(globalServerURL + 'order/' + $scope.formData.OrderID + '/')
            .success(function(response) {
                $scope.saveInvoiceModalForm.inputOrderNumber.$setValidity('default1', true);
                $scope.calculatedAmounts[3].amount = response.Total
            })
            .error(function(response) {
                $scope.saveInvoiceModalForm.inputOrderNumber.$setValidity('default1', false);
            });
        };

        $scope.updateAmounts = function() {
            var subtotal = parseFloat($scope.formData.Amount);
            var vatcost = parseFloat($scope.formData.VAT) ? parseFloat($scope.formData.VAT) : 0;
            var total = subtotal + vatcost;

            var parts = subtotal.toString().split(".");
            if (parts.length > 1) {
                parts[1] = parts[1].slice(0,2);
                subtotal = parts.join('.');
            }
            else {
                subtotal = subtotal.toString() + '.00'
            }

            parts = vatcost.toString().split(".");
            if (parts.length > 1) {
                parts[1] = parts[1].slice(0,2);
                vatcost = parts.join('.');
            }
            else {
                vatcost = vatcost.toString() + '.00'
            }

            parts = total.toString().split(".");
            if (parts.length > 1) {
                parts[1] = parts[1].slice(0,2);
                total = parts.join('.');
            }
            else {
                total = total.toString() + '.00'
            }

            $scope.calculatedAmounts[0].amount = subtotal;
            $scope.calculatedAmounts[1].amount = vatcost;
            $scope.calculatedAmounts[2].amount = total;
        }

        // fetch the report filter options
        $scope.filterReportBy = function() {
            $scope.formData = {};
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices_report_filter'
            };
            $http(req).success(function(response) {
                $scope.invoiceReportProjectsList = response['projects'];
                $scope.invoiceReportSuppliersList = response['suppliers'];
                $scope.invoiceReportPaymentDateList = response['paymentdates'];
                $scope.paymentDatesExist = response['paymentdates_exist'];
                $scope.invoiceReportStatusList = response['statuses'];
                console.log("Invoice report filter options loaded")
            })
        };

        // process an order
        $scope.toggleInvoiceStatus = function(status, index){
            $http({
                method: 'POST',
                url: globalServerURL + 'invoice/' + $scope.selectedInvoices[index].ID + '/status',
                data: {'status':status}
            }).success(function(){
                $scope.selectedInvoices[index].Status = status;
                console.log("Invoice " + $scope.selectedInvoices[index].ID + " status to " + status);
                index+=1;
                if (index < $scope.selectedInvoices.length){
                    $scope.toggleInvoiceStatus(status, index);
                }
            })
        };

        // set each invoice selected/unselected
        $scope.toggleAllCheckboxes = function(){
            var state = $scope.selectedInvoices.length != $scope.jsoninvoices.length;
            for (var i in $scope.jsoninvoices){
                $scope.jsoninvoices[i].selected = state;
            }
        }

        // deselect all the selected orders
        $scope.clearSelectedInvoices = function(){
            if ($scope.selectedInvoices.length == $scope.jsoninvoices.length){
                $scope.toggleAllCheckboxes();
            }
            else{
                for (var i in $scope.selectedInvoices){
                    var result = $.grep($scope.jsoninvoices, function(e) {
                        return e.ID == $scope.selectedInvoices[i].ID;
                    });
                    var ind = $scope.jsoninvoices.indexOf(result[0]);
                    if (ind>-1) {
                        $scope.jsoninvoices[ind].selected = false;
                    }
                }
            }
        }

        $scope.setReportType = function(type){
            $scope.selectedReportType = type;
        };

        $scope.getReport = function (report) {
            if ( report == 'invoices' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'invoices_report',
                    data: $scope.formData,
                    responseType: 'arraybuffer'
                }).success(function (response, status, headers, config) {
                    spinner.stop();
                    var file = new Blob([response], {type: 'application/pdf'});
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    var config = {
                      data: file,
                      filename: filename,
                    };

                    FileSaver.saveAs(config);
                }).error(function(data, status, headers, config) {
                    console.log("Invoice pdf download error")
                });
            }
        };

        $scope.getExcelReport = function (report) {
            if ( report == 'invoices' ) {
                var target = document.getElementsByClassName('excel_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'excel_invoices_report',
                    data: $scope.formData,
                    responseType: 'arraybuffer'
                }).success(function (response, status, headers, config) {
                    spinner.stop();
                    var blob = new Blob([response], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    var config = {
                      data: blob,
                      filename: filename,
                    };

                    FileSaver.saveAs(config);
                }).error(function(data, status, headers, config) {
                    console.log("Invoice excel download error")
                });
            }
        };

    }
]);
